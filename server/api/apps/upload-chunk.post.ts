import { requireAnyRole } from '../../utils/auth'
// @ts-ignore - formidable types provided via local shim
import formidable from 'formidable'
// @ts-ignore - fs-extra types provided via local shim
import fse from 'fs-extra'
import path from 'node:path'
import crypto from 'node:crypto'

export const config = { api: { bodyParser: false } }

// Store upload session metadata in memory (for single-server setup)
// For multi-server, would need Redis or similar
const uploadSessions = new Map<string, {
  userId: string
  fileName: string
  totalChunks: number
  receivedChunks: Set<number>
  createdAt: number
  metadata: Record<string, string>
}>()

// Clean up stale sessions older than 1 hour
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of uploadSessions.entries()) {
    if (now - session.createdAt > 60 * 60 * 1000) {
      uploadSessions.delete(id)
      // Clean up chunk files
      const chunksDir = path.join(process.cwd(), '.storage-tmp', 'chunks', id)
      fse.remove(chunksDir).catch(() => {})
    }
  }
}, 5 * 60 * 1000) // Check every 5 minutes

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const chunksBaseDir = path.join(process.cwd(), '.storage-tmp', 'chunks')
  await fse.ensureDir(chunksBaseDir)

  const form = formidable({ 
    multiples: false, 
    uploadDir: chunksBaseDir,
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024 // 100MB per chunk (Cloudflare limit)
  })

  const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(event.node.req, (err: any, fields: any, files: any) => (err ? reject(err) : resolve({ fields, files })))
  })

  const getField = (key: string): string | undefined => {
    const v = (fields as Record<string, any>)[key]
    if (Array.isArray(v)) return v[0] ? String(v[0]) : undefined
    if (v === undefined || v === null) return undefined
    const s = String(v).trim()
    return s.length ? s : undefined
  }

  const uploadId = getField('uploadId')
  const chunkIndexStr = getField('chunkIndex')
  const totalChunksStr = getField('totalChunks')
  const fileName = getField('fileName')

  if (!uploadId || chunkIndexStr === undefined || totalChunksStr === undefined || !fileName) {
    throw createError({ statusCode: 400, message: 'Missing required fields: uploadId, chunkIndex, totalChunks, fileName' })
  }

  const chunkIndex = parseInt(chunkIndexStr, 10)
  const totalChunks = parseInt(totalChunksStr, 10)

  if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || totalChunks < 1) {
    throw createError({ statusCode: 400, message: 'Invalid chunkIndex or totalChunks' })
  }

  const chunkFile = Array.isArray(files.chunk) ? files.chunk[0] : (files.chunk as formidable.File)
  if (!chunkFile?.filepath) {
    throw createError({ statusCode: 400, message: 'Chunk file is required' })
  }

  // Initialize or get session
  let session = uploadSessions.get(uploadId)
  if (!session) {
    // First chunk - create session
    session = {
      userId: user.id,
      fileName,
      totalChunks,
      receivedChunks: new Set(),
      createdAt: Date.now(),
      metadata: {
        name: getField('name') || '',
        platform: getField('platform') || 'IOS',
        appId: getField('appId') || ''
      }
    }
    uploadSessions.set(uploadId, session)
  }

  // Verify session belongs to this user
  if (session.userId !== user.id) {
    throw createError({ statusCode: 403, message: 'Upload session belongs to another user' })
  }

  // Store chunk
  const sessionDir = path.join(chunksBaseDir, uploadId)
  await fse.ensureDir(sessionDir)
  const chunkPath = path.join(sessionDir, `chunk-${chunkIndex.toString().padStart(5, '0')}`)
  await fse.move(chunkFile.filepath, chunkPath, { overwrite: true })
  
  session.receivedChunks.add(chunkIndex)

  // Check if all chunks received
  const allReceived = session.receivedChunks.size === totalChunks
  
  if (allReceived) {
    // Assemble file
    const assembledPath = path.join(sessionDir, fileName)
    const writeStream = fse.createWriteStream(assembledPath)
    
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(sessionDir, `chunk-${i.toString().padStart(5, '0')}`)
      const data = await fse.readFile(cp)
      writeStream.write(data)
      await fse.remove(cp) // Clean up chunk after writing
    }
    
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
      writeStream.end()
    })

    // Clean up session
    uploadSessions.delete(uploadId)

    return {
      status: 'complete',
      chunkIndex,
      totalChunks,
      receivedChunks: totalChunks,
      assembledPath, // Will be used by finalize endpoint
      uploadId,
      metadata: session.metadata
    }
  }

  return {
    status: 'pending',
    chunkIndex,
    totalChunks,
    receivedChunks: session.receivedChunks.size
  }
})





