import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { z } from 'zod'

const schema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required')
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const sourceUserId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!sourceUserId) {
    throw createError({ statusCode: 400, message: 'Source user ID is required' })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { targetUserId } = parsed.data

  if (sourceUserId === targetUserId) {
    throw createError({ statusCode: 400, message: 'Cannot merge user with themselves' })
  }

  // Verify source user exists and belongs to this owner
  const sourceUser = await prisma.registeredUser.findUnique({
    where: { id: sourceUserId },
    include: { devices: true }
  })

  if (!sourceUser) {
    throw createError({ statusCode: 404, message: 'Source user not found' })
  }

  if (sourceUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Verify target user exists and belongs to this owner
  const targetUser = await prisma.registeredUser.findUnique({
    where: { id: targetUserId }
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'Target user not found' })
  }

  if (targetUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied to target user' })
  }

  // Move all devices from source to target
  // Handle potential UDID conflicts by skipping devices that already exist on target
  let devicesMoved = 0
  let devicesSkipped = 0

  for (const device of sourceUser.devices) {
    try {
      await prisma.userDevice.update({
        where: { id: device.id },
        data: { registeredUserId: targetUserId }
      })
      devicesMoved++
    } catch (e: any) {
      // If there's a unique constraint violation (same UDID already on target), skip
      if (e.code === 'P2002') {
        // Delete the duplicate device from source
        await prisma.userDevice.delete({ where: { id: device.id } })
        devicesSkipped++
      } else {
        throw e
      }
    }
  }

  // Delete the source user (now has no devices)
  await prisma.registeredUser.delete({
    where: { id: sourceUserId }
  })

  return {
    success: true,
    devicesMoved,
    devicesSkipped,
    targetUser: {
      id: targetUser.id,
      discordName: targetUser.discordName
    }
  }
})

