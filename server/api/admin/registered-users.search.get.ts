import { prisma } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Only SUPERADMIN can search across all moderators' user databases
  await requireRole(event, 'SUPERADMIN')

  const { q } = getQuery(event)
  const query = typeof q === 'string' ? q.trim() : ''

  const where = query
    ? {
        OR: [
          { discordName: { contains: query, mode: 'insensitive' } },
          { discordId: query }
        ]
      }
    : {}

  const results = await prisma.registeredUser.findMany({
    where,
    take: 25,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: {
          id: true,
          nickname: true
        }
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

  return results.map((r) => ({
    id: r.id,
    discordName: r.discordName,
    discordId: r.discordId,
    owner: {
      id: r.owner.id,
      nickname: r.owner.nickname
    },
    linkedUser: r.linkedUser
      ? {
          id: r.linkedUser.id,
          nickname: r.linkedUser.nickname,
          discordId: r.linkedUser.discordId,
          discordUsername: r.linkedUser.discordUsername
        }
      : null
  }))
})


