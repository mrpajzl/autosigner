import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  // Only SUPERADMIN can manage manual links
  await requireRole(event, 'SUPERADMIN')

  const body = await readBody<{
    discordUserId?: string
    registeredUserId?: string
  }>(event)

  if (!body.discordUserId || !body.registeredUserId) {
    throw createError({ statusCode: 400, message: 'discordUserId and registeredUserId are required' })
  }

  const discordUser = await prisma.user.findUnique({
    where: { id: body.discordUserId }
  })

  if (!discordUser || discordUser.authProvider !== 'discord') {
    throw createError({ statusCode: 400, message: 'Invalid Discord user' })
  }

  const regUser = await prisma.registeredUser.findUnique({
    where: { id: body.registeredUserId },
    include: {
      owner: {
        select: { id: true, nickname: true }
      }
    }
  })

  if (!regUser) {
    throw createError({ statusCode: 404, message: 'Registered user not found' })
  }

  const updated = await prisma.registeredUser.update({
    where: { id: regUser.id },
    data: {
      linkedUserId: discordUser.id,
      // Optionally also keep discordId in sync for easier lookups
      discordId: discordUser.discordId ?? regUser.discordId
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
    owner: updated.owner
  }
})


