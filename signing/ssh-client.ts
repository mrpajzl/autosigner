import { createReadStream, createWriteStream } from 'node:fs'
import { readFile, stat, rm, open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { execa } from 'execa'
import type { SignInput } from './engine'
import { requestSchema } from './protocol'

export class SignerUnavailableError extends Error {}

export async function signIpaOverSsh(input: SignInput, signal: AbortSignal): Promise<void> {
  const host = process.env.SIGNER_SSH_HOST
  const user = process.env.SIGNER_SSH_USER
  const port = process.env.SIGNER_SSH_PORT || '22'
  const key = process.env.SIGNER_SSH_KEY_PATH
  const knownHosts = process.env.SIGNER_SSH_KNOWN_HOSTS
  if (!host || !user || !key || !knownHosts || !/^[a-zA-Z0-9._:-]+$/.test(host) || !/^[a-zA-Z0-9_-]+$/.test(user) || !/^\d+$/.test(port)) {
    throw new Error('Remote signer SSH configuration is incomplete')
  }
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(input.sourcePath)) { signal.throwIfAborted(); hash.update(chunk) }
  const header = requestSchema.parse({
    version: 1, p12: (await readFile(input.p12Path)).toString('base64'), password: input.p12Password,
    profile: (await readFile(input.profilePath)).toString('base64'), bundleId: input.bundleId,
    sourceSize: (await stat(input.sourcePath)).size, sourceSha256: hash.digest('hex')
  })
  const child = execa('ssh', [
    '-T', '-p', port, '-i', key, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
    '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${knownHosts}`,
    '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
    `${user}@${host}`, 'sign'
  ], { buffer: false, cancelSignal: signal, forceKillAfterDelay: 5000, stderr: 'pipe' })
  // Runner errors are deliberately sanitized. Never forward arbitrary SSH/tool output to logs.
  let stderr = ''
  child.stderr?.on('data', chunk => { if (stderr.length < 4096) stderr += chunk.toString() })
  const result = child.then(() => null, error => error)
  try {
    const transfer = await Promise.allSettled([
      pipeline(Readable.from((async function* () {
        yield Buffer.from(JSON.stringify(header) + '\n')
        yield* createReadStream(input.sourcePath)
      })()), child.stdin!, { signal }),
      pipeline(child.stdout!, createWriteStream(input.outputPath, { mode: 0o600 }), { signal })
    ])
    const error = await result
    if (error) {
      if (error.exitCode === 255 || stderr.includes('SIGNER_BUSY')) throw new SignerUnavailableError('Mac signer is unavailable; job will be retried')
      throw new Error(signal.aborted ? 'Signing deadline exceeded' : 'Remote signing failed')
    }
    if (transfer.some(x => x.status === 'rejected')) throw new Error('Signing transfer failed')
    // A successful command must return a nonempty ZIP; the Mac verifies codesign before sending it.
    const file = await open(input.outputPath, 'r')
    try {
      const magic = Buffer.alloc(4)
      await file.read(magic, 0, 4, 0)
      if (!magic.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new Error('Signer returned an invalid IPA')
    } finally { await file.close() }
  } catch (error) {
    child.kill('SIGTERM')
    await result
    await rm(input.outputPath, { force: true })
    throw error
  }
}
