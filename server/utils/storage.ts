import path from 'node:path'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import fse from 'fs-extra'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3'

type StorageDriver = 'local' | 's3'

interface StoredObjectInfo {
  key: string
  size?: number
  lastModified?: Date
}

const localPublicRoot = process.env.LOCAL_PUBLIC_ROOT
  ? path.resolve(process.env.LOCAL_PUBLIC_ROOT)
  : path.join(process.cwd(), 'public')
const tmpRoot = path.join(process.cwd(), '.storage-tmp')

const shouldUseS3 = Boolean(
  process.env.MINIO_PUBLIC &&
  process.env.MINIO_USER &&
  process.env.MINIO_PASSWORD
)

const driver: StorageDriver = shouldUseS3 ? 's3' : 'local'
const bucket = process.env.MINIO_BUCKET || 'fastsigner'
const region = process.env.MINIO_REGION || 'us-east-1'
const endpoint = resolveEndpoint() || 'http://127.0.0.1:9000'

const s3Client = driver === 's3'
  ? new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_USER!,
      secretAccessKey: process.env.MINIO_PASSWORD!
    }
  })
  : undefined

/**
 * Convert a public path (e.g. `/uploads/user/foo.ipa`) into a storage key
 */
function normalizePublicPath(publicPath: string): string {
  const trimmed = (publicPath || '').trim()
  const withoutPrefix = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  const normalized = path.posix.normalize(withoutPrefix).replace(/^(\.\.(\/|\\|$))+/g, '')
  return normalized
}

function resolveEndpoint(): string | undefined {
  const explicit = process.env.MINIO_ENDPOINT?.trim()
  if (explicit) return explicit

  const base = process.env.MINIO_PUBLIC?.trim()
  if (!base) return undefined

  const port = process.env.MINIO_PORT?.trim()

  try {
    const parsed = new URL(base)
    if (port && !parsed.port) {
      parsed.port = port
    }
    return parsed.toString().replace(/\/$/, '')
  } catch {
    const host = base.replace(/\/$/, '')
    const finalHost = port ? `${host}:${port}` : host
    return host.startsWith('http://') || host.startsWith('https://')
      ? finalHost
      : `http://${finalHost}`
  }
}

async function ensureTmpRoot(): Promise<void> {
  await fse.ensureDir(tmpRoot)
}

async function saveFileFromPath(publicPath: string, sourcePath: string, contentType?: string): Promise<void> {
  const key = normalizePublicPath(publicPath)
  if (driver === 'local') {
    const dest = path.join(localPublicRoot, key)
    await fse.ensureDir(path.dirname(dest))
    await fse.copy(sourcePath, dest, { overwrite: true })
    return
  }

  const stream = fs.createReadStream(sourcePath)
  await s3Client!.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: stream,
    ContentType: contentType
  }))
}

async function saveBuffer(publicPath: string, data: Buffer | string, contentType?: string): Promise<void> {
  const key = normalizePublicPath(publicPath)
  if (driver === 'local') {
    const dest = path.join(localPublicRoot, key)
    await fse.ensureDir(path.dirname(dest))
    await fse.writeFile(dest, data)
    return
  }

  const body = typeof data === 'string' ? Buffer.from(data) : data
  await s3Client!.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  }))
}

async function createReadStream(publicPath: string, range?: { start?: number; end?: number }): Promise<Readable> {
  const key = normalizePublicPath(publicPath)
  if (driver === 'local') {
    const filePath = path.join(localPublicRoot, key)
    if (!await fse.pathExists(filePath)) {
      throw createError({ statusCode: 404, statusMessage: 'File not found' })
    }
    const options: any = {}
    if (range?.start !== undefined) options.start = range.start
    if (range?.end !== undefined) options.end = range.end
    return fs.createReadStream(filePath, options)
  }

  try {
    const result = await s3Client!.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range
        ? `bytes=${range.start !== undefined ? range.start : ''}-${range.end !== undefined ? range.end : ''}`
        : undefined
    }))
    const body = result.Body
    if (!body) {
      throw createError({ statusCode: 404, statusMessage: 'File not found' })
    }
    if (body instanceof Readable) {
      return body
    }
    // @ts-expect-error - Body can be a stream-like object
    return Readable.from(body)
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'File not found' })
    }
    throw e
  }
}

async function pathExists(publicPath: string): Promise<boolean> {
  const key = normalizePublicPath(publicPath)
  if (driver === 'local') {
    const full = path.join(localPublicRoot, key)
    return fse.pathExists(full)
  }

  try {
    await s3Client!.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404) return false
    return false
  }
}

async function deletePrefix(publicPathPrefix: string): Promise<void> {
  const keyPrefix = normalizePublicPath(publicPathPrefix).replace(/\/+$/, '')
  if (!keyPrefix) return

  if (driver === 'local') {
    const target = path.join(localPublicRoot, keyPrefix)
    await fse.remove(target)
    return
  }

  let continuationToken: string | undefined
  do {
    const response = await s3Client!.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: keyPrefix,
      ContinuationToken: continuationToken
    }))
    const objects = response.Contents || []
    if (objects.length > 0) {
      await s3Client!.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objects.map(o => ({ Key: o.Key! }))
        }
      }))
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)
}

async function listPrefix(publicPathPrefix: string): Promise<StoredObjectInfo[]> {
  const keyPrefix = normalizePublicPath(publicPathPrefix).replace(/\/+$/, '')
  if (driver === 'local') {
    const target = path.join(localPublicRoot, keyPrefix)
    if (!await fse.pathExists(target)) return []
    const entries: StoredObjectInfo[] = []

    async function walk(current: string, rel: string): Promise<void> {
      const stats = await fse.stat(current)
      if (stats.isFile()) {
        entries.push({ key: path.posix.join(keyPrefix, rel).replace(/^\//, ''), size: stats.size, lastModified: stats.mtime })
        return
      }
      const children = await fse.readdir(current)
      for (const child of children) {
        await walk(path.join(current, child), path.posix.join(rel, child))
      }
    }

    await walk(target, '')
    return entries
  }

  const results: StoredObjectInfo[] = []
  let continuationToken: string | undefined
  do {
    const response = await s3Client!.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: keyPrefix,
      ContinuationToken: continuationToken
    }))
    for (const obj of response.Contents || []) {
      results.push({
        key: obj.Key || '',
        size: obj.Size,
        lastModified: obj.LastModified
      })
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)
  return results
}

async function downloadToTempFile(publicPath: string, label?: string): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  await ensureTmpRoot()
  const key = normalizePublicPath(publicPath)
  const baseName = path.basename(key) || 'object.bin'
  const dirPrefix = path.join(tmpRoot, `${label || 'object'}-`)
  const tmpDir = await fse.mkdtemp(dirPrefix)
  const destPath = path.join(tmpDir, baseName)
  if (driver === 'local') {
    const source = path.join(localPublicRoot, key)
    await fse.copy(source, destPath)
    return {
      filePath: destPath,
      cleanup: async () => fse.remove(tmpDir).catch(() => {})
    }
  }

  const stream = await createReadStream(publicPath)
  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath)
    stream.pipe(writeStream)
    stream.on('error', reject)
    writeStream.on('error', reject)
    writeStream.on('finish', () => resolve())
  })
  return {
    filePath: destPath,
    cleanup: async () => fse.remove(tmpDir).catch(() => {})
  }
}

async function getMetadata(publicPath: string): Promise<{ size: number; lastModified?: Date }> {
  const key = normalizePublicPath(publicPath)
  if (driver === 'local') {
    const target = path.join(localPublicRoot, key)
    const stats = await fse.stat(target)
    return { size: stats.size, lastModified: stats.mtime }
  }
  const head = await s3Client!.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  return {
    size: head.ContentLength || 0,
    lastModified: head.LastModified
  }
}

export const storage = {
  driver,
  saveFileFromPath,
  saveBuffer,
  createReadStream,
  downloadToTempFile,
  pathExists,
  deletePrefix,
  listPrefix,
  normalizePublicPath,
  getMetadata
}

export type { StoredObjectInfo }

