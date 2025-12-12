import { prisma } from '../../../../utils/db'
import { setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const moderatorId = getRouterParam(event, 'id')

  if (!moderatorId) {
    throw createError({ statusCode: 400, message: 'Moderator ID is required' })
  }

  // Get active certificate for this moderator
  const cert = await prisma.certificate.findFirst({
    where: {
      userId: moderatorId,
      active: true
    }
  })

  // If no active certificate, check managerProfile
  if (!cert) {
    const manager = await prisma.user.findUnique({
      where: { id: moderatorId },
      include: { managerProfile: true }
    })

    if (!manager?.managerProfile?.certificatePem) {
      throw createError({ statusCode: 404, message: 'Certificate not found' })
    }

    // Convert PEM to P12-like format (or return PEM)
    // For now, we'll return the PEM certificate
    const filename = `${manager.managerProfile.displayName || manager.nickname || 'certificate'}_cert.pem`
    const buffer = Buffer.from(manager.managerProfile.certificatePem)
    
    setHeader(event, 'Content-Type', 'application/x-pem-file')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    setHeader(event, 'Content-Length', String(buffer.length))
    
    return buffer
  }

  const filename = cert.displayName 
    ? `${cert.displayName.replace(/[^a-zA-Z0-9]/g, '_')}.p12`
    : `certificate_${cert.id}.p12`

  const buffer = Buffer.from(cert.p12Data)
  
  setHeader(event, 'Content-Type', 'application/x-pkcs12')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  setHeader(event, 'Content-Length', String(buffer.length))
  
  return buffer
})

