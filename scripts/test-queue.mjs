import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('restorecheck')) throw new Error('Set DATABASE_URL to a disposable restorecheck database')
await build({ entryPoints: ['tests/queue.test.ts'], bundle: true, platform: 'node', target: 'node22', format: 'esm', packages: 'external', outfile: 'dist/tests/queue.test.mjs', plugins: [{name:'fake-signing',setup(b){b.onResolve({filter:/^\.\/signer$/},a=>a.importer.endsWith('signing-queue.ts')?{path:'signer',namespace:'fake'}:null);b.onLoad({filter:/.*/,namespace:'fake'},()=>({contents:'export const signApp = (...args) => globalThis.__testSign(...args); export const signAppForUser = signApp;',loader:'js'}))}}] })
const result = spawnSync(process.execPath, ['--test', 'dist/tests/queue.test.mjs'], { stdio: 'inherit' })
process.exitCode = result.status || 0
