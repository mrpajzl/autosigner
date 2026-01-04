import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  // Only SUPERADMIN can manage manual links
  await requireRole(event, 'SUPERADMIN')

  const body = await readBody<{
    registeredUserId?: string
  }>(event)

  if (!body.registeredUserId) {
    throw createError({ statusCode: 400, message: 'registeredUserId is required' })
  }

  const regUser = await prisma.registeredUser.findUnique({
    where: { id: body.registeredUserId },
    include: {
      owner: {
        select: { id: true, nickname: true }
      },
      linkedUser: {
        select: {
          id: true,
          nickname: true,
          discordId: true,
          discordUsername: true
        }
      }
    }
  })

  if (!regUser) {
    throw createError({ statusCode: 404, message: 'Registered user not found' })
  }

  if (!regUser.linkedUserId) {
    throw createError({ statusCode: 400, message: 'This registered user is not linked to any Discord user' })
  }

  // Unlink by setting linkedUserId to null
  const updated = await prisma.registeredUser.update({
    where: { id: regUser.id },
    data: {
      linkedUserId: null
    },
    include: {
      owner: {
        select: { id: true, nickname: true }
      }
    }
  })

  return {
    success: true,
    registeredUserId: updated.id,
    owner: updated.owner,
    unlinkedDiscordUser: regUser.linkedUser
  }
})
