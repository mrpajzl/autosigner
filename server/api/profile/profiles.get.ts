import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const items = await prisma.provisioningProfile.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return items.map((p) => ({
    id: p.id,
    name: p.name,
    platform: (p.platform as 'IOS' | 'TVOS'),
    uuid: p.uuid,
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    active: p.active
  }))
})


