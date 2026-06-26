import { extname } from 'path'
import { sendStream, setHeader, setResponseStatus } from 'h3'
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

  const size = metadata.size
  const rangeHeader = getRequestHeader(event, 'range')

  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Content-Type', contentTypeForPath(publicPath))
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  if (metadata.lastModified) {
    setHeader(event, 'Last-Modified', metadata.lastModified.toUTCString())
  }

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
    if (!match) {
      setResponseStatus(event, 416)
      setHeader(event, 'Content-Range', `bytes */${size}`)
      return ''
    }

    let start = match[1] ? parseInt(match[1], 10) : 0
    let end = match[2] ? parseInt(match[2], 10) : size - 1
    if (Number.isNaN(start)) start = 0
    if (Number.isNaN(end) || end >= size) end = size - 1

    if (start > end || start >= size) {
      setResponseStatus(event, 416)
      setHeader(event, 'Content-Range', `bytes */${size}`)
      return ''
    }

    const chunkSize = end - start + 1
    setResponseStatus(event, 206)
    setHeader(event, 'Content-Length', String(chunkSize))
    setHeader(event, 'Content-Range', `bytes ${start}-${end}/${size}`)
    const stream = await storage.createReadStream(publicPath, { start, end })
    return sendStream(event, stream)
  }

  setHeader(event, 'Content-Length', String(size))
  const stream = await storage.createReadStream(publicPath)
  return sendStream(event, stream)
})
