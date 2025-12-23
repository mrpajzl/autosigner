import { requireUser } from '../utils/auth'
import { prisma } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  
  // Only Discord users can access this endpoint
  if (user.authProvider !== 'discord' || !user.discordId) {
    throw createError({ 
      statusCode: 403, 
      message: 'This endpoint is only for Discord-authenticated users' 
    })
  }
  
  // Find all RegisteredUser entries linked to this user
  const registrations = await prisma.registeredUser.findMany({
    where: {
      OR: [
        { linkedUserId: user.id },
        { discordId: user.discordId }
      ]
    },
    include: {
      devices: {
        orderBy: { createdAt: 'desc' }
      },
      owner: {
        select: {
          id: true,
          nickname: true,
          managerProfile: {
            select: {
              displayName: true,
              companyName: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // Group by moderator
  const moderators = new Map()
  
  for (const reg of registrations) {
    const moderatorId = reg.owner.id
    
    if (!moderators.has(moderatorId)) {
      moderators.set(moderatorId, {
        moderatorId: reg.owner.id,
        moderatorNickname: reg.owner.nickname,
        moderatorDisplayName: reg.owner.managerProfile?.displayName || reg.owner.nickname,
        moderatorCompany: reg.owner.managerProfile?.companyName,
        registrations: []
      })
    }
    
    moderators.get(moderatorId).registrations.push({
      id: reg.id,
      discordName: reg.discordName,
      notes: reg.notes,
      paidForNextYear: reg.paidForNextYear,
      devices: reg.devices.map(d => ({
        id: d.id,
        udid: d.udid,
        name: d.name,
        platform: d.platform,
        createdAt: d.createdAt
      })),
      createdAt: reg.createdAt,
      updatedAt: reg.updatedAt
    })
  }
  
  return {
    moderators: Array.from(moderators.values())
  }
})

