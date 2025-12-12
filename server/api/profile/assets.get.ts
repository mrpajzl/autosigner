import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const [certificates, profiles] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        expiresAt: true,
        active: true,
        createdAt: true
      }
    }),
    prisma.provisioningProfile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        platform: true,
        expiresAt: true,
        active: true,
        createdAt: true
      }
    })
  ])

  return {
    certificates: certificates.map(c => ({
      id: c.id,
      displayName: c.displayName,
      expiresAt: c.expiresAt?.toISOString() || null,
      active: c.active,
      createdAt: c.createdAt.toISOString()
    })),
    profiles: profiles.map(p => ({
      id: p.id,
      name: p.name,
      platform: p.platform as 'IOS' | 'TVOS',
      expiresAt: p.expiresAt?.toISOString() || null,
      active: p.active,
      createdAt: p.createdAt.toISOString()
    }))
  }
})

