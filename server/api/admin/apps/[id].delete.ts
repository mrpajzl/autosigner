import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { storage } from '../../../utils/storage'

/**
 * DELETE /api/admin/apps/:id
 * Deletes an app and all its signed versions.
 * MANAGER can delete their own apps, SUPERADMIN can delete any app.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing app id' })
  }

  const app = await prisma.app.findUnique({ 
    where: { id },
    include: { owner: { select: { id: true } } }
  })
  
  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }

  // Only owner or SUPERADMIN can delete
  if (app.ownerId !== user.id && user.role !== 'SUPERADMIN') {
    throw createError({ statusCode: 403, message: 'Not authorized to delete this app' })
  }

  // Delete all signed version files
  const signedVersions = await prisma.signedVersion.findMany({
    where: { appId: id },
    select: { signerId: true }
  })
  
  for (const sv of signedVersions) {
    await storage.deletePrefix(`/uploads/${sv.signerId}/${app.id}`).catch(() => {})
  }

  // Delete original app files
  await storage.deletePrefix(`/uploads/${app.ownerId}/${app.id}`).catch(() => {})
  
  // Delete original IPA if it exists (use deletePrefix which works for single files too)
  if (app.originalIpaPath) {
    await storage.deletePrefix(app.originalIpaPath).catch(() => {})
  }

  // Delete app (cascade will delete SignedVersions)
  await prisma.app.delete({ where: { id } })
  
  return { ok: true }
})

