import { requireAnyRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { z } from 'zod'

const schema = z.object({
  udid: z.string().min(1, 'UDID is required').optional(),
  name: z.string().min(1, 'Device name is required').max(100).optional(),
  platform: z.enum(['IOS', 'MAC_OS']).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const userId = getRouterParam(event, 'id')
  const deviceId = getRouterParam(event, 'deviceId')
  const body = await readBody(event)

  if (!userId || !deviceId) {
    throw createError({ statusCode: 400, message: 'User ID and Device ID are required' })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
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

  const { udid, name, platform } = parsed.data

  // If changing UDID, check for duplicates
  if (udid && udid !== existingDevice.udid) {
    const duplicate = await prisma.userDevice.findUnique({
      where: {
        registeredUserId_udid: {
          registeredUserId: userId,
          udid
        }
      }
    })
    if (duplicate) {
      throw createError({
        statusCode: 409,
        message: 'This UDID is already registered for this user'
      })
    }
  }

  const device = await prisma.userDevice.update({
    where: { id: deviceId },
    data: {
      ...(udid && { udid }),
      ...(name && { name }),
      ...(platform && { platform })
    }
  })

  return {
    id: device.id,
    udid: device.udid,
    name: device.name,
    platform: device.platform,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt
  }
})

