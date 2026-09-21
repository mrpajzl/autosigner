import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

test('aborted S3 download closes streams and removes partial signing files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'signing-transfer-'))
  const cwd = process.cwd()
  const server = http.createServer((req,res) => {
    res.writeHead(200, { 'content-length': '1048576', 'content-type': 'application/octet-stream' })
    res.write(Buffer.alloc(1024)) // Leave transfer unfinished until the caller cancels.
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  process.chdir(root)
  const address = server.address() as { port: number }
  Object.assign(process.env, { MINIO_PUBLIC: 'http://127.0.0.1', MINIO_ENDPOINT: `http://127.0.0.1:${address.port}`, MINIO_USER: 'test', MINIO_PASSWORD: 'test', MINIO_BUCKET: 'test' })
  try {
    const { storage } = await import('../server/utils/storage')
    await assert.rejects(storage.downloadToTempFile('/uploads/test.ipa','aborted',AbortSignal.timeout(250)))
    assert.deepEqual(await readdir(path.join(root,'.storage-tmp')),[])
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
    process.chdir(cwd)
    await rm(root,{recursive:true,force:true})
  }
})
