import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { linkDiscordUser } from '../../../utils/discord-linking'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    discordUserId: string
  }>(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Registered user ID is required' })
  }

  if (!body.discordUserId) {
    throw createError({ statusCode: 400, message: 'Discord user ID is required' })
  }

  // Check if RegisteredUser exists and belongs to this moderator
  const regUser = await prisma.registeredUser.findUnique({
    where: { id }
  })

  if (!regUser) {
    throw createError({ statusCode: 404, message: 'Registered user not found' })
  }

  if (regUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Get the Discord user
  const discordUser = await prisma.user.findUnique({
    where: { id: body.discordUserId }
  })

  if (!discordUser || discordUser.authProvider !== 'discord') {
    throw createError({ statusCode: 400, message: 'Invalid Discord user' })
  }

  // Link the RegisteredUser to the Discord user
  const updated = await prisma.registeredUser.update({
    where: { id: regUser.id },
    data: {
      linkedUserId: discordUser.id,
      discordId: discordUser.discordId ?? regUser.discordId
    },
    include: {
      linkedUser: {
        select: {
          id: true,
          nickname: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true
        }
      }
    }
  })

  // Also trigger the linking function to catch any other matches
  if (discordUser.discordId && discordUser.discordUsername) {
    await linkDiscordUser(
      discordUser.id,
      discordUser.discordId,
      discordUser.discordUsername,
      discordUser.nickname
    )
  }

  return {
    success: true,
    registeredUser: {
      id: updated.id,
      discordName: updated.discordName,
      linkedUser: updated.linkedUser
    }
  }
})
