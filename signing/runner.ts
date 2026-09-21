// Forced SSH command: one invocation, one signature, no idle Node process.
import path from 'node:path'
import os from 'node:os'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { signIpa } from './engine'
import { MAX_HEADER_BYTES, requestSchema } from './protocol'

process.umask(0o077)
const stateDir = process.env.FASTSIGNER_STATE_DIR || path.join(os.homedir(), '.fastsigner-worker')
process.env.FASTSIGNER_STATE_DIR = stateDir
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 20 * 60 * 1000)
for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.on(sig, () => controller.abort())
console.log = (...args) => console.error(...args)
let jobDir: string | undefined
let locked = false
const lock = path.join(stateDir, 'signing.lock')
try {
  await mkdir(stateDir, { recursive: true, mode: 0o700 })
  // macOS shlock atomically acquires a PID lock and reclaims dead owners.
  const acquired = spawnSync('/usr/bin/shlock', ['-p', String(process.pid), '-f', lock])
  if (acquired.status !== 0) throw new Error('SIGNER_BUSY')
  locked = true
  if (process.env.SSH_ORIGINAL_COMMAND === 'health') {
    process.stdout.write('fastsigner-worker-v1\n')
  } else {
    jobDir = await mkdtemp(path.join(stateDir, 'job-'))
    const sourcePath = path.join(jobDir, 'source.ipa')
    let header = Buffer.alloc(0)
    let request: ReturnType<typeof requestSchema.parse> | undefined
    let received = 0
    const hash = createHash('sha256')
    const chunks = async function* () {
      for await (const value of process.stdin) {
        controller.signal.throwIfAborted()
        let chunk = Buffer.from(value)
        if (!request) {
          const newline = chunk.indexOf(10)
          const end = newline < 0 ? chunk.length : newline
          if (header.length + end > MAX_HEADER_BYTES) throw new Error('Invalid request header')
          header = Buffer.concat([header, chunk.subarray(0, end)])
          if (newline < 0) continue
          request = requestSchema.parse(JSON.parse(header.toString('utf8')))
          chunk = chunk.subarray(newline + 1)
        }
        received += chunk.length
        if (received > request.sourceSize) throw new Error('IPA size mismatch')
        hash.update(chunk)
        yield chunk
      }
    }
    await pipeline(Readable.from(chunks()), createWriteStream(sourcePath, { mode: 0o600 }), { signal: controller.signal })
    if (!request || received !== request.sourceSize || hash.digest('hex') !== request.sourceSha256) throw new Error('Incomplete or corrupted IPA transfer')
    const p12Path = path.join(jobDir, 'cert.p12')
    const profilePath = path.join(jobDir, 'profile.mobileprovision')
    await writeFile(p12Path, Buffer.from(request.p12, 'base64'), { mode: 0o600 })
    await writeFile(profilePath, Buffer.from(request.profile, 'base64'), { mode: 0o600 })
    const outputPath = path.join(jobDir, 'signed.ipa')
    await signIpa({ sourcePath, p12Path, p12Password: request.password, profilePath, bundleId: request.bundleId, outputPath, workDir: path.join(jobDir, 'unpacked') }, controller.signal)
    await pipeline(createReadStream(outputPath), process.stdout, { signal: controller.signal })
  }
} catch (error) {
  console.error(error instanceof Error && error.message === 'SIGNER_BUSY' ? 'SIGNER_BUSY' : 'SIGNING_FAILED')
  process.exitCode = 1
} finally {
  clearTimeout(timer)
  if (jobDir) await rm(jobDir, { recursive: true, force: true })
  if (locked) await rm(lock, { recursive: true, force: true })
}
