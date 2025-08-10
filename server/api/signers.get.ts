import { prisma } from '../utils/db'

// Deprecated in favor of the new public moderators endpoint
export default defineEventHandler(async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      apps: { select: { id: true }, where: {} }
    },
    orderBy: { createdAt: 'desc' }
  })
  return users.map((u) => ({ id: u.id, email: u.email, role: u.role, apps: u.apps.length }))
})


