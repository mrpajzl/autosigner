import { prisma } from '../../utils/db'
import plist from 'plist'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })
  const app = await prisma.app.findUnique({ where: { id } })
  if (!app) throw createError({ statusCode: 404 })

  // Always prefer current request origin to avoid embedding localhost from env
  const baseUrl = getRequestURL(event).origin
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


