import { prisma } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')

  // Note: Auto-linking now happens automatically during Discord OAuth login
  // No need for manual linking here anymore

  const users = await prisma.user.findMany({
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


