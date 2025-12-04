import { requireAnyRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const userId = getRouterParam(event, 'id')
  const deviceId = getRouterParam(event, 'deviceId')

  if (!userId || !deviceId) {
    throw createError({ statusCode: 400, message: 'User ID and Device ID are required' })
  }

  // Check if registered user exists and belongs to this owner
  const registeredUser = await prisma.registeredUser.findUnique({
    where: { id: userId }
  })

  if (!registeredUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (registeredUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Check if device exists
  const existingDevice = await prisma.userDevice.findUnique({
    where: { id: deviceId }
  })

  if (!existingDevice || existingDevice.registeredUserId !== userId) {
    throw createError({ statusCode: 404, message: 'Device not found' })
  }

  await prisma.userDevice.delete({
    where: { id: deviceId }
  })

  return { success: true }
})

