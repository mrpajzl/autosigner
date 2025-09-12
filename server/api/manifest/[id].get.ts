import { prisma } from '../../utils/db'
import plist from 'plist'

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

  const platformIdentifier = app.platform?.toUpperCase() === 'TVOS'
    ? 'com.apple.platform.appletvos'
    : 'com.apple.platform.iphoneos'

  const iconRel = (app.iconPath || '').replace(/^\//, '')
  const iconUrl = iconRel ? `${baseUrl}/${iconRel}` : undefined

  const assets: any[] = [
    { kind: 'software-package', url: assetUrl }
  ]
  if (iconUrl) {
    assets.push({ kind: 'display-image', url: iconUrl })
    assets.push({ kind: 'full-size-image', url: iconUrl })
  }

  const manifest = {
    items: [
      {
        assets,
        metadata: {
          'bundle-identifier': app.bundleId,
          'bundle-version': app.version,
          kind: 'software',
          'platform-identifier': platformIdentifier,
          title: app.name
        }
      }
    ]
  }

  const xml = plist.build(manifest as any)
  setHeader(event, 'content-type', 'application/xml')
  return xml
})


