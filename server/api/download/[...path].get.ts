import { sendStream, setResponseStatus } from 'h3'
import { storage } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const raw = (event.context.params as any)?.path as string | string[] | undefined
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing path' })
  }

  const parts = Array.isArray(raw) ? raw : [raw]
  const joined = parts.join('/')
  const normalizedRel = storage.normalizePublicPath(joined.replace(/^\/+/, ''))
  const publicPath = `/${normalizedRel}`

  let metadata: { size: number }
  try {
    metadata = await storage.getMetadata(publicPath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const size = metadata.size
  const rangeHeader = getRequestHeader(event, 'range')
  setHeader(event, 'Accept-Ranges', 'bytes')
  setHeader(event, 'Content-Type', 'application/octet-stream')

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


