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
  const assetUrl = app.signedIpaPath ? `${baseUrl}${app.signedIpaPath}` : `${baseUrl}${app.originalIpaPath}`

  const manifest = {
    items: [
      {
        assets: [
          { kind: 'software-package', url: assetUrl }
        ],
        metadata: {
          'bundle-identifier': app.bundleId,
          'bundle-version': app.version,
          kind: 'software',
          title: app.name
        }
      }
    ]
  }

  const xml = plist.build(manifest as any)
  setHeader(event, 'content-type', 'application/xml')
  return xml
})


