import { prisma } from '../../../utils/db'
import { requireAnyRole } from '../../../utils/auth'
import { signingQueue } from '../../../utils/signing-queue'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const app = await prisma.app.findUnique({ where: { id } })
  if (!app) throw createError({ statusCode: 404, message: 'Not found' })
  if (user.role !== 'SUPERADMIN' && app.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  await prisma.app.update({ where: { id: app.id }, data: { status: 'SIGNING', signedAt: null } })

  // Use the signing queue instead of fire-and-forget
  await signingQueue.enqueueOwnerSigning(app.id, app.ownerId)

  return { ok: true }
})


