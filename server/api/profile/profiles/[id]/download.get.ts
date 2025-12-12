import { requireUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const profileId = getRouterParam(event, 'id')

  if (!profileId) {
    throw createError({ statusCode: 400, message: 'Profile ID is required' })
  }

  const profile = await prisma.provisioningProfile.findFirst({
    where: {
      id: profileId,
      userId: user.id
    }
  })

  if (!profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
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

