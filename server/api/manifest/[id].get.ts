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

  async function tryExtractBundleIdFromIpa(): Promise<string | undefined> {
    try {
      const abs = path.join(process.cwd(), 'public', rel)
      let infoPlist = ''
      try {
        const { stdout } = await execa('unzip', ['-Z1', abs])
        infoPlist = stdout.split('\n').map(s => s.trim()).find(s => /^Payload\/[^/]+\.app\/Info\.plist$/.test(s)) || ''
      } catch {}
      if (!infoPlist) {
        try {
          const { stdout } = await execa('zipinfo', ['-1', abs])
          infoPlist = stdout.split('\n').map(s => s.trim()).find(s => /^Payload\/[^/]+\.app\/Info\.plist$/.test(s)) || ''
        } catch {}
      }
      if (!infoPlist) return undefined

      const { stdout: plistBuf } = await execa('unzip', ['-p', abs, infoPlist], { encoding: 'buffer' } as any)
      const buf: Buffer = plistBuf as unknown as Buffer
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
          'bundle-identifier': (app.bundleId && app.bundleId.length > 0) ? app.bundleId : (await tryExtractBundleIdFromIpa()) || '',
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
  return xml
})


