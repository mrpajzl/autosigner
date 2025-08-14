import formidable from 'formidable'
import fse from 'fs-extra'
import path from 'node:path'
import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { encrypt } from '../../utils/crypto'
import { triggerResignForUser } from '../../utils/signer'

export const config = { api: { bodyParser: false } }

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', user.id, '_profile_tmp')
  await fse.ensureDir(uploadDir)

  const form = formidable({ multiples: true, uploadDir, keepExtensions: true })
  const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(event.node.req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })))
  })

  const getField = (key: keyof typeof fields): string | undefined => {
    const v = fields[key]
    if (Array.isArray(v)) return v[0] ? String(v[0]) : undefined
    if (v === undefined || v === null) return undefined
    const s = String(v).trim()
    return s.length ? s : undefined
  }

  const displayName = getField('displayName')
  const companyName = getField('companyName')
  const p12Password = getField('p12Password')

  const profile = Array.isArray(files.profile) ? files.profile[0] : (files.profile as formidable.File)
  const cert = Array.isArray(files.cert) ? files.cert[0] : (files.cert as formidable.File)
  const key = Array.isArray(files.key) ? files.key[0] : (files.key as formidable.File)

  const updateData: any = {}
  if (displayName) updateData.displayName = displayName
  if (companyName) updateData.companyName = companyName
  if (p12Password) updateData.p12PasswordEnc = JSON.stringify(encrypt(p12Password))

  // Save uploaded files into encrypted fields
  if (cert?.filepath) {
    const certText = await fse.readFile(cert.filepath, 'utf8')
    updateData.certificatePem = JSON.stringify(encrypt(certText))
  }
  if (key?.filepath) {
    const keyText = await fse.readFile(key.filepath, 'utf8')
    updateData.privateKeyPem = JSON.stringify(encrypt(keyText))
  }
  if (profile?.filepath) {
    const buf = await fse.readFile(profile.filepath)
    // If a platform field is provided, route accordingly, else assume iOS
    const platform = (getField('platform') || 'IOS').toUpperCase()
    if (platform === 'TVOS') updateData.mobileprovisionTvos = buf
    else updateData.mobileprovisionIos = buf
  }

  const mp = await prisma.managerProfile.upsert({
    where: { userId: user.id },
    update: updateData,
    create: { userId: user.id, displayName: user.email, ...updateData }
  })

  // Trigger background re-sign for this user's apps
  ;(async () => {
    try {
      await triggerResignForUser(user.id)
    } catch (e) {
      console.error('Failed to trigger resign', e)
    }
  })()

  return { ok: true, profileId: mp.id }
})


