import { prisma } from '../../../../utils/db'
import { setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const moderatorId = getRouterParam(event, 'id')
  const platform = getQuery(event).platform as 'IOS' | 'TVOS' | undefined

  if (!moderatorId) {
    throw createError({ statusCode: 400, message: 'Moderator ID is required' })
  }

  // Get active profile for this moderator
  const profile = platform 
    ? await prisma.provisioningProfile.findFirst({
        where: {
          userId: moderatorId,
          active: true,
          platform
        }
      })
    : await prisma.provisioningProfile.findFirst({
        where: {
          userId: moderatorId,
          active: true
        }
      })

  // If no active profile, check managerProfile
  if (!profile) {
    const manager = await prisma.user.findUnique({
      where: { id: moderatorId },
      include: { managerProfile: true }
    })

    if (!manager?.managerProfile) {
      throw createError({ statusCode: 404, message: 'Profile not found' })
    }

    let profileData: Buffer | null = null
    let profilePlatform: 'IOS' | 'TVOS' = 'IOS'

    if (platform === 'TVOS' && manager.managerProfile.mobileprovisionTvos) {
      profileData = Buffer.from(manager.managerProfile.mobileprovisionTvos)
      profilePlatform = 'TVOS'
    } else if (manager.managerProfile.mobileprovisionIos) {
      profileData = Buffer.from(manager.managerProfile.mobileprovisionIos)
      profilePlatform = 'IOS'
    } else if (manager.managerProfile.mobileprovisionTvos) {
      profileData = Buffer.from(manager.managerProfile.mobileprovisionTvos)
      profilePlatform = 'TVOS'
    }

    if (!profileData) {
      throw createError({ statusCode: 404, message: 'Profile not found' })
    }

    const filename = `${manager.managerProfile.displayName || manager.nickname || 'profile'}_${profilePlatform.toLowerCase()}.mobileprovision`
    
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    setHeader(event, 'Content-Length', String(profileData.length))
    
    return profileData
  }

  const filename = profile.name 
    ? `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}.mobileprovision`
    : `profile_${profile.id}.mobileprovision`

  const buffer = Buffer.from(profile.data)
  
  setHeader(event, 'Content-Type', 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  setHeader(event, 'Content-Length', String(buffer.length))
  
  return buffer
})

