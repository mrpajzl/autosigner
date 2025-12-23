import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { z } from 'zod'

const schema = z.object({
  discordName: z.string().min(1, 'Discord name is required').max(100).optional(),
  discordId: z.string().nullable().optional(), // Discord ID for automatic linking
  notes: z.string().max(500).nullable().optional(),
  paidForNextYear: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
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

  const { discordName, discordId, notes, paidForNextYear } = parsed.data

  // If changing discord name, check for duplicates
  if (discordName && discordName !== existing.discordName) {
    const duplicate = await prisma.registeredUser.findUnique({
      where: {
        ownerId_discordName: {
          ownerId: user.id,
          discordName
        }
      }
    })
    if (duplicate) {
      throw createError({
        statusCode: 409,
        message: 'A user with this Discord name already exists'
      })
    }
  }

  const updated = await prisma.registeredUser.update({
    where: { id },
    data: {
      ...(discordName && { discordName }),
      ...(discordId !== undefined && { discordId }),
      ...(notes !== undefined && { notes }),
      ...(paidForNextYear !== undefined && { paidForNextYear })
    },
    include: {
      devices: true
    }
  })

  return {
    id: updated.id,
    discordName: updated.discordName,
    discordId: updated.discordId,
    notes: updated.notes,
    paidForNextYear: updated.paidForNextYear,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    devices: updated.devices,
    deviceCount: updated.devices.length
  }
})

