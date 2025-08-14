import formidable from 'formidable'
import fse from 'fs-extra'
import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { encrypt } from '../../utils/crypto'

export const config = { api: { bodyParser: false } }

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

  const displayName = getField('displayName')
  const p12 = (files.p12 && (Array.isArray(files.p12) ? files.p12[0] : files.p12)) as formidable.File | undefined
  const p12Password = getField('p12Password')
  if (!p12?.filepath) throw createError({ statusCode: 400, message: 'P12 file is required' })
  const buf = await fse.readFile(p12.filepath)
  const created = await prisma.certificate.create({
    data: {
      userId: user.id,
      displayName: displayName || null,
      p12Data: buf,
      p12PasswordEnc: p12Password ? JSON.stringify(encrypt(p12Password)) : null
    }
  })

  return { id: created.id }
})


