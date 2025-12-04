#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'
import fse from 'fs-extra'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const bucket = process.env.MINIO_BUCKET || 'fastsigner'
const region = process.env.MINIO_REGION || 'us-east-1'
const accessKeyId = process.env.MINIO_USER
const secretAccessKey = process.env.MINIO_PASSWORD
const endpoint = resolveEndpoint()

if (!process.env.MINIO_PUBLIC || !accessKeyId || !secretAccessKey) {
  console.error('Missing MINIO_* env vars. Please set MINIO_PUBLIC, MINIO_USER, MINIO_PASSWORD (and MINIO_PORT if needed).')
  process.exit(1)
}

const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  console.log('No local uploads directory found. Nothing to migrate.')
  process.exit(0)
}

const client = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey }
})

let migrated = 0

async function walkAndUpload(currentDir) {
  const entries = await fse.readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const absPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      await walkAndUpload(absPath)
      continue
    }
    const relPath = path.relative(path.join(process.cwd(), 'public'), absPath).replace(/\\/g, '/')
    await uploadFile(absPath, relPath)
  }
}

async function uploadFile(absPath, relPath) {
  const key = relPath.startsWith('/') ? relPath.slice(1) : relPath
  console.log(`Uploading ${relPath} -> s3://${bucket}/${key}`)
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fs.createReadStream(absPath)
  }))
  migrated++
}

function resolveEndpoint() {
  const explicit = process.env.MINIO_ENDPOINT?.trim()
  if (explicit) return explicit
  const base = process.env.MINIO_PUBLIC?.trim() || ''
  const port = process.env.MINIO_PORT?.trim()
  try {
    const parsed = new URL(base)
    if (port && !parsed.port) parsed.port = port
    return parsed.toString().replace(/\/$/, '')
  } catch {
    const host = base.replace(/\/$/, '')
    const finalHost = port ? `${host}:${port}` : host
    return host.startsWith('http://') || host.startsWith('https://') ? finalHost : `http://${finalHost}`
  }
}

walkAndUpload(uploadsDir)
  .then(() => {
    console.log(`Migration complete. Uploaded ${migrated} files to bucket "${bucket}".`)
    console.log('You can safely remove local public/uploads after verifying objects in MinIO.')
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })

