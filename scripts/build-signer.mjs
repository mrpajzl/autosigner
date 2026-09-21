import { build } from 'esbuild'
await build({ entryPoints: ['signing/runner.ts'], bundle: true, platform: 'node', target: 'node22', format: 'esm', outfile: 'dist/signer/runner.mjs', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } })
