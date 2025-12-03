import formidable from 'formidable'
import fse from 'fs-extra'
import { execa } from 'execa'
import path from 'node:path'
import os from 'node:os'
import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { encrypt } from '../../utils/crypto'

export const config = { api: { bodyParser: false } }

/**
 * Extract certificate expiration date from a P12 file using OpenSSL
 */
async function extractCertExpirationDate(p12Path: string, password: string): Promise<Date | null> {
  try {
    // Check if openssl supports -legacy flag (OpenSSL 3.x does, LibreSSL doesn't)
    let useLegacy = false
    try {
      const { stdout } = await execa('openssl', ['version'])
      useLegacy = stdout.includes('OpenSSL 3') || stdout.includes('OpenSSL 1.1')
    } catch {}

    // Extract certificate from P12
    const certArgs = [
      'pkcs12', '-in', p12Path,
      '-clcerts', '-nokeys',
      '-passin', `pass:${password}`
    ]
    if (useLegacy) certArgs.push('-legacy')
    
    const { stdout: certPem } = await execa('openssl', certArgs)
    
    // Get the end date from the certificate
    const tempCertPath = path.join(os.tmpdir(), `cert-${Date.now()}.pem`)
    await fse.writeFile(tempCertPath, certPem)
    
    try {
      const { stdout: endDate } = await execa('openssl', [
        'x509', '-in', tempCertPath, '-enddate', '-noout'
      ])
      
      // Parse the date - format: "notAfter=Mon DD HH:MM:SS YYYY GMT"
      const match = endDate.match(/notAfter=(.+)/)
      if (match) {
        const dateStr = match[1].trim()
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    } finally {
      await fse.remove(tempCertPath).catch(() => {})
    }
  } catch (e) {
    console.warn('Failed to extract certificate expiration date:', e)
  }
  return null
}

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

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
  const p12Password = getField('p12Password') || ''
  if (!p12?.filepath) throw createError({ statusCode: 400, message: 'P12 file is required' })
  const buf = await fse.readFile(p12.filepath)
  
  // Extract certificate expiration date
  const expiresAt = await extractCertExpirationDate(p12.filepath, p12Password)
  
  const created = await prisma.certificate.create({
    data: {
      userId: user.id,
      displayName: displayName || null,
      p12Data: buf,
      p12PasswordEnc: p12Password ? JSON.stringify(encrypt(p12Password)) : null,
      expiresAt
    }
  })

  return { id: created.id }
})


