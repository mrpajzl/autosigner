import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
await import('./build-signer.mjs')
await build({ entryPoints: ['tests/signing.test.ts', 'tests/storage-transfer.test.ts'], bundle: true, platform: 'node', target: 'node22', format: 'esm', outdir: 'dist/tests', outExtension: { '.js': '.mjs' }, banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } })
const result = spawnSync(process.execPath, ['--test', 'dist/tests/signing.test.mjs', 'dist/tests/storage-transfer.test.mjs'], { stdio: 'inherit' })
process.exitCode = result.status || 0
