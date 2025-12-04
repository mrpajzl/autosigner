import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { z } from 'zod'

const schema = z.object({
  discordName: z.string().min(1, 'Discord name is required').max(100),
  notes: z.string().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { discordName, notes } = parsed.data

  // Check if user with this discord name already exists for this owner
  const existing = await prisma.registeredUser.findUnique({
    where: {
      ownerId_discordName: {
        ownerId: user.id,
        discordName
      }
    }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'A user with this Discord name already exists'
    })
  }

  const registeredUser = await prisma.registeredUser.create({
    data: {
      ownerId: user.id,
      discordName,
      notes
    },
    include: {
      devices: true
    }
  })

  return {
    id: registeredUser.id,
    discordName: registeredUser.discordName,
    notes: registeredUser.notes,
    createdAt: registeredUser.createdAt,
    updatedAt: registeredUser.updatedAt,
    devices: registeredUser.devices,
    deviceCount: 0
  }
})

