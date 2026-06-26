import { extname } from 'path'
import { setHeader } from 'h3'
import { storage } from '../../utils/storage'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.plist': 'application/xml',
  '.ipa': 'application/octet-stream',
  '.p12': 'application/x-pkcs12',
  '.mobileprovision': 'application/octet-stream'
}

function contentTypeForPath(publicPath: string): string {
  return CONTENT_TYPES[extname(publicPath).toLowerCase()] || 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
  const raw = (event.context.params as any)?.path as string | string[] | undefined
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing path' })
  }

  const parts = Array.isArray(raw) ? raw : [raw]
  const normalizedRel = storage.normalizePublicPath(['uploads', ...parts].join('/'))
  const publicPath = `/${normalizedRel}`

  let metadata: { size: number; lastModified?: Date }
  try {
    metadata = await storage.getMetadata(publicPath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Content-Type', contentTypeForPath(publicPath))
  setHeader(event, 'Content-Length', String(metadata.size))
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  if (metadata.lastModified) {
    setHeader(event, 'Last-Modified', metadata.lastModified.toUTCString())
  }

  return ''
})
