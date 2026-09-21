import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { requestSchema } from '../signing/protocol'
import { signIpaOverSsh, SignerUnavailableError } from '../signing/ssh-client'

const valid = { version: 1, p12: 'YQ==', password: 'sensitive-test-password', profile: 'YQ==', sourceSize: 4, sourceSha256: '0'.repeat(64) }

test('protocol bounds and version are enforced', () => {
  assert.equal(requestSchema.parse(valid).version, 1)
  for (const change of [{ version: 2 }, { sourceSize: -1 }, { sourceSize: 5 * 1024 ** 3 }, { sourceSha256: 'bad' }, { unexpected: true }]) {
    assert.throws(() => requestSchema.parse({ ...valid, ...change }))
  }
})

test('runner rejects incomplete/corrupted streams and removes job files without exposing credentials', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'signer-test-'))
  try {
    for (const content of [JSON.stringify(valid) + '\nabc', JSON.stringify(valid) + '\nabcd', 'invalid-json\n']) {
      const result = spawnSync(process.execPath, ['dist/signer/runner.mjs'], { env: { ...process.env, FASTSIGNER_STATE_DIR: dir }, input: content, encoding: 'utf8', timeout: 10000 })
      assert.equal(result.status, 1)
      assert.equal(result.stdout, '')
      assert.equal(result.stderr.trim(), 'SIGNING_FAILED')
      assert.deepEqual(await readdir(dir), [])
    }
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('SSH transfer validates output and distinguishes offline/busy from signing failures', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ssh-signer-test-'))
  const original = { ...process.env }
  try {
    const sourcePath = path.join(dir, 'source.ipa')
    const p12Path = path.join(dir, 'cert.p12'), profilePath = path.join(dir, 'profile')
    const outputPath = path.join(dir, 'signed.ipa')
    await writeFile(sourcePath, Buffer.from([80, 75, 3, 4, 1, 2, 3]))
    await writeFile(p12Path, 'certificate'); await writeFile(profilePath, 'profile')
    Object.assign(process.env, { PATH: dir + ':' + original.PATH, SIGNER_SSH_HOST: 'localhost', SIGNER_SSH_USER: 'worker', SIGNER_SSH_KEY_PATH: '/unused', SIGNER_SSH_KNOWN_HOSTS: '/unused' })
    const input = { sourcePath, p12Path, profilePath, p12Password: 'secret', outputPath, workDir: dir }
    for (const [mode, expected] of [['ok', null], ['busy', SignerUnavailableError], ['offline', SignerUnavailableError], ['invalid', Error]] as const) {
      await writeFile(path.join(dir, 'ssh'), `#!${process.execPath}\nprocess.stdin.resume();process.stdin.on('end',()=>{${mode === 'ok' ? "process.stdout.write(Buffer.from([80,75,3,4,1,2,3]))" : mode === 'busy' ? "console.error('SIGNER_BUSY');process.exitCode=1" : mode === 'offline' ? 'process.exitCode=255' : "process.stdout.write('not an ipa')"}});`, { mode: 0o700 })
      if (expected) await assert.rejects(signIpaOverSsh(input, AbortSignal.timeout(5000)), expected)
      else { await signIpaOverSsh(input, AbortSignal.timeout(5000)); assert.deepEqual(await readFile(outputPath), await readFile(sourcePath)) }
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key]
    Object.assign(process.env, original)
    await rm(dir, { recursive: true, force: true })
  }
})
