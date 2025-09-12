import { prisma } from '../../utils/db'
import plist from 'plist'
import { execa } from 'execa'
import path from 'node:path'
import fs from 'node:fs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })
  const app = await prisma.app.findUnique({ where: { id } })
  if (!app) throw createError({ statusCode: 404 })

  // Prefer configured public base URL (e.g., https://your-domain) to avoid
  // proxy mis-detection of scheme/host; fall back to current request origin
  const rc = useRuntimeConfig()
  const configured = rc?.public?.baseUrl as string | undefined
  const baseUrl = (configured && configured.length > 0)
    ? configured.replace(/\/$/, '')
    : getRequestURL(event).origin
  const ipaPath = app.signedIpaPath || app.originalIpaPath
  const rel = (ipaPath || '').replace(/^\//, '')
  const assetUrl = `${baseUrl}/api/download/${rel}`

  function shellQuote(p: string): string {
    return `'${p.replace(/'/g, `'\'`)}'`
  }

  async function tryExtractBundleIdFromIpa(): Promise<string | undefined> {
    try {
      const abs = path.join(process.cwd(), 'public', rel)
      // Find Info.plist entry path
      let infoPlist = ''
      try {
        const { stdout } = await execa('bash', ['-lc', `unzip -Z1 ${shellQuote(abs)} | grep -E '^Payload/[^/]+\\.app/Info\\.plist$' | head -n1`])
        infoPlist = stdout.trim()
      } catch {}
      if (!infoPlist) {
        try {
          const { stdout } = await execa('bash', ['-lc', `zipinfo -1 ${shellQuote(abs)} | grep -E '^Payload/[^/]+\\.app/Info\\.plist$' | head -n1`])
          infoPlist = stdout.trim()
        } catch {}
      }
      if (!infoPlist) return undefined

      // Extract as base64 to safely build a Buffer
      const { stdout: b64 } = await execa('bash', ['-lc', `unzip -p ${shellQuote(abs)} ${shellQuote(infoPlist)} | base64`])
      const buf = Buffer.from(b64, 'base64')
      const head = buf.subarray(0, 8).toString('utf8')
      if (head.startsWith('bplist')) {
        try {
          const { stdout } = await execa('plutil', ['-convert', 'xml1', '-o', '-', '-'], { input: buf })
          const parsed: any = plist.parse(stdout)
          const id = parsed?.CFBundleIdentifier
          return typeof id === 'string' && id.length > 0 ? id : undefined
        } catch {
          return undefined
        }
      } else {
        const parsed: any = plist.parse(buf.toString('utf8'))
        const id = parsed?.CFBundleIdentifier
        return typeof id === 'string' && id.length > 0 ? id : undefined
      }
    } catch {
      return undefined
    }
  }

  const platformIdentifier = app.platform?.toUpperCase() === 'TVOS'
    ? 'com.apple.platform.appletvos'
    : 'com.apple.platform.iphoneos'

  const iconRel = (app.iconPath || '').replace(/^\//, '')
  const iconUrl = iconRel ? `${baseUrl}/${iconRel}` : undefined
  const pngPath = path.join(process.cwd(), 'public', 'png.png')
  const hasPng = fs.existsSync(pngPath)
  const pngUrl = `${baseUrl}/png.png`

  // Resolve real bundle identifier and persist if missing in DB
  const realBundleId = (app.bundleId && app.bundleId.length > 0)
    ? app.bundleId
    : (await tryExtractBundleIdFromIpa()) || ''
  if ((!app.bundleId || app.bundleId.length === 0) && realBundleId) {
    // Best-effort persist; do not block manifest response
    prisma.app.update({ where: { id: app.id }, data: { bundleId: realBundleId } }).catch(() => {})
  }

  const assets: any[] = [
    { kind: 'software-package', url: assetUrl }
  ]
  if (iconUrl) {
    assets.push({ kind: 'display-image', url: iconUrl })
  } else if (hasPng) {
    assets.push({ kind: 'display-image', url: pngUrl })
  }
  // Some installers expect a full-size-image entry; fallback to IPA URL like the working example
  assets.push({ kind: 'full-size-image', url: assetUrl })

  const manifest = {
    items: [
      {
        assets,
        metadata: {
          'bundle-identifier': realBundleId,
          'bundle-version': app.version,
          kind: 'software',
          'platform-identifier': platformIdentifier,
          title: app.name
        }
      }
    ]
  }

  const xml = plist.build(manifest as any)
  setHeader(event, 'content-type', 'text/xml')
  setHeader(event, 'cache-control', 'no-store, no-cache, must-revalidate, max-age=0')
  return xml
})


