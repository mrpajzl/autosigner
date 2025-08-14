import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const items = await prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return items.map((c) => ({ id: c.id, displayName: c.displayName, createdAt: c.createdAt.toISOString(), active: c.active }))
})


