import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  // Check if user exists and belongs to this owner
  const existing = await prisma.registeredUser.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (existing.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Delete user (devices will be cascade deleted)
  await prisma.registeredUser.delete({
    where: { id }
  })

  return { success: true }
})

