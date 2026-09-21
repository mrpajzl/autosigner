import path from 'node:path'
import { open, readdir } from 'node:fs/promises'

const machOMagic = new Set([0xfeedface, 0xcefaedfe, 0xfeedfacf, 0xcffaedfe, 0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca])

// Sign actual code from the inside out. Containers such as Kodi's Frameworks/lib
// hold code and resources but are not themselves signable bundles.
export async function nestedCodeTargets(appDir: string, signal: AbortSignal): Promise<string[]> {
  const targets: string[] = []
  async function visit(dir: string): Promise<void> {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      signal.throwIfAborted()
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '_CodeSignature') continue
        await visit(file)
        if (/\.(app|appex|framework|xpc)$/.test(entry.name)) targets.push(file)
      } else if (entry.isFile()) {
        const handle = await open(file, 'r')
        try {
          const magic = Buffer.alloc(4)
          const { bytesRead } = await handle.read(magic, 0, 4, 0)
          if (bytesRead === 4 && machOMagic.has(magic.readUInt32BE())) targets.push(file)
        } finally { await handle.close() }
      }
      // Symlinks were validated by the engine; their actual files are visited once.
    }
  }
  await visit(appDir)
  return targets
}
