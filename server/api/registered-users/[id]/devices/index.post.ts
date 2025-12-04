import { requireAnyRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { z } from 'zod'

const schema = z.object({
  udid: z.string().min(1, 'UDID is required'),
  name: z.string().min(1, 'Device name is required').max(100),
  platform: z.enum(['IOS', 'MAC_OS']).default('IOS')
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const userId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
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

  const { udid, name, platform } = parsed.data

  // Check if device with this UDID already exists for this user
  const existingDevice = await prisma.userDevice.findUnique({
    where: {
      registeredUserId_udid: {
        registeredUserId: userId,
        udid
      }
    }
  })

  if (existingDevice) {
    throw createError({
      statusCode: 409,
      message: 'This device is already registered for this user'
    })
  }

  const device = await prisma.userDevice.create({
    data: {
      registeredUserId: userId,
      udid,
      name,
      platform
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

