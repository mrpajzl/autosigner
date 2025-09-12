import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { sendStream, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  const raw = (event.context.params as any)?.path as string | string[] | undefined
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing path' })
  }

  const parts = Array.isArray(raw) ? raw : [raw]
  const joined = parts.join('/')
  const publicRoot = path.join(process.cwd(), 'public')
  const normalizedRel = path
    .normalize(joined.replace(/^\/+/, ''))
    .replace(/^(\.\.(?:\/|\\|$))+/, '')
  const absolutePath = path.join(publicRoot, normalizedRel)

  // Disallow path traversal outside public directory
  const publicRootWithSep = publicRoot.endsWith(path.sep) ? publicRoot : publicRoot + path.sep
  if (!(absolutePath + path.sep).startsWith(publicRootWithSep)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  let stat
  try {
    stat = await fsp.stat(absolutePath)
    if (!stat.isFile()) throw new Error('Not a file')
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const size = stat.size
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
    const stream = fs.createReadStream(absolutePath, { start, end })
    return sendStream(event, stream)
  }

  setHeader(event, 'Content-Length', String(size))
  const stream = fs.createReadStream(absolutePath)
  return sendStream(event, stream)
})


