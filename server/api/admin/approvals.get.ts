import { prisma } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  const pending = await prisma.user.findMany({ where: { status: 'PENDING', role: 'MANAGER' }, select: { id: true, email: true, createdAt: true } })
  return pending
})


