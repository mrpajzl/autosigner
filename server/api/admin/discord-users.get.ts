import { prisma } from '../../utils/db'
import { requireRole } from '../../utils/auth'
import { autoLinkAllDiscordUsers } from '../../utils/discord-linking'

export default defineEventHandler(async (event) => {
  // Only SUPERADMIN can view full list of Discord-authenticated users
  await requireRole(event, 'SUPERADMIN')

  // Auto-link all Discord users with RegisteredUser entries when admin views the page
  // This ensures new connections are found automatically
  try {
    await autoLinkAllDiscordUsers()
  } catch (error) {
    // Log error but don't fail the request
    console.error('Error during auto-linking:', error)
  }

  const users = await prisma.user.findMany({
    where: {
      authProvider: 'discord'
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nickname: true,
      role: true,
      status: true,
      createdAt: true,
      authProvider: true,
      discordId: true,
      discordUsername: true,
      discordAvatar: true,
      linkedRegistrations: {
        select: {
          id: true,
          owner: {
            select: {
              id: true,
              nickname: true
            }
          }
        }
      }
    }
  })

  return users
})


