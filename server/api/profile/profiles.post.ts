import formidable from 'formidable'
import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import plist from 'plist'
import { execa } from 'execa'
import fse from 'fs-extra'

export const config = { api: { bodyParser: false } }

async function parseMobileProvision(buf: Buffer): Promise<{ uuid?: string; teamId?: string; expiresAt?: Date }> {
  try {
    // mobileprovision is a CMS (pkcs7) wrapper around a plist; use openssl to extract
    const { stdout } = await execa('bash', ['-lc', 'openssl smime -inform der -verify -noverify -in /dev/stdin -out /dev/stdout'], { input: buf })
    const obj = plist.parse(stdout) as any
    const uuid = obj?.UUID as string | undefined
    const teamId = Array.isArray(obj?.TeamIdentifier) ? obj.TeamIdentifier[0] : obj?.TeamIdentifier
    const expiresAt = obj?.ExpirationDate ? new Date(obj.ExpirationDate) : undefined
    return { uuid, teamId, expiresAt }
  } catch {
    return {}
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const form = formidable({ multiples: false })
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

  const platform = (getField('platform') || 'IOS').toUpperCase()
  const name = getField('name')
  const fp = (files.profile && (Array.isArray(files.profile) ? files.profile[0] : files.profile)) as formidable.File | undefined
  if (!fp?.filepath) throw createError({ statusCode: 400, message: 'Profile file is required' })
  const buf = await fse.readFile(fp.filepath)
  const meta = await parseMobileProvision(buf)

  const created = await prisma.provisioningProfile.create({
    data: {
      userId: user.id,
      platform,
      name: name || null,
      uuid: meta.uuid || null,
      teamId: meta.teamId || null,
      expiresAt: meta.expiresAt || null,
      data: buf
    }
  })
  return { id: created.id }
})


