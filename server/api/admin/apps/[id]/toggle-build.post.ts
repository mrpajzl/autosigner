import { prisma } from '../../../../utils/db'
import { requireAnyRole } from '../../../../utils/auth'

/**
 * POST /api/admin/apps/[id]/toggle-build
 * Toggles the showBuildNumber setting for an app
 * This affects all users globally on the homepage
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'App ID is required' })
  }

  const app = await prisma.app.findUnique({
    where: { id },
    select: { showBuildNumber: true }
  })

  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }

  const updated = await prisma.app.update({
    where: { id },
    data: { showBuildNumber: !app.showBuildNumber },
    select: { id: true, showBuildNumber: true }
  })

  return updated
})

