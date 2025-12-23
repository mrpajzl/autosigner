import { prisma } from '../../../../utils/db'
import { requireAnyRole } from '../../../../utils/auth'

/**
 * POST /api/admin/apps/[id]/toggle-visibility
 * Toggles the loggedInOnly flag for an app.
 * When true, the app is only shown to logged-in users in public listings.
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'App ID is required' })
  }

  const app = await prisma.app.findUnique({
    where: { id },
    select: { loggedInOnly: true }
  })

  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }

  const updated = await prisma.app.update({
    where: { id },
    data: { loggedInOnly: !app.loggedInOnly },
    select: { id: true, loggedInOnly: true }
  })

  return updated
})


