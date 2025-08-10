import crypto from 'node:crypto'

export function getEncryptionKey(): Buffer {
  const secret = process.env.CRYPTO_SECRET
  if (!secret || secret.length < 16) throw new Error('CRYPTO_SECRET must be set and at least 16 chars')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(textOrBuffer: string | Buffer): { iv: string; data: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(textOrBuffer), cipher.final()])
  const tag = cipher.getAuthTag()
  return { iv: Buffer.concat([iv, tag]).toString('base64'), data: enc.toString('base64') }
}

export function decrypt(payload: { iv: string; data: string }): Buffer {
  const buf = Buffer.from(payload.iv, 'base64')
  const iv = buf.subarray(0, 16)
  const tag = buf.subarray(16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()])
  return dec
}


