import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const registeredUser = await prisma.registeredUser.findUnique({
    where: { id },
    include: {
      devices: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!registeredUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Ensure the user belongs to this owner
  if (registeredUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  return {
    id: registeredUser.id,
    discordName: registeredUser.discordName,
    notes: registeredUser.notes,
    createdAt: registeredUser.createdAt,
    updatedAt: registeredUser.updatedAt,
    devices: registeredUser.devices.map(device => ({
      id: device.id,
      udid: device.udid,
      name: device.name,
      platform: device.platform,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    })),
    deviceCount: registeredUser.devices.length
  }
})

