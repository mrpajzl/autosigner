import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  // Only MANAGER and SUPERADMIN can search Discord users
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const { q } = getQuery(event)
  const query = typeof q === 'string' ? q.trim() : ''

  if (!query) {
    return []
  }

  // Search for Discord-authenticated users by nickname, Discord username, or Discord ID
  const discordUsers = await prisma.user.findMany({
    where: {
      authProvider: 'discord',
      OR: [
        { nickname: { contains: query, mode: 'insensitive' } },
        { discordUsername: { contains: query, mode: 'insensitive' } },
        { discordId: query }
      ]
    },
    select: {
      id: true,
      nickname: true,
      discordId: true,
      discordUsername: true,
      discordAvatar: true
    },
    take: 20,
    orderBy: { createdAt: 'desc' }
  })

  return discordUsers.map(u => ({
    id: u.id,
    nickname: u.nickname,
    discordId: u.discordId,
    discordUsername: u.discordUsername,
    discordAvatar: u.discordAvatar
  }))
})
