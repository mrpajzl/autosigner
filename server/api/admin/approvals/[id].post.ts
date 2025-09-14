import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  const id = getRouterParam(event, 'id')
  const { action, role } = await readBody<{ action: 'APPROVE' | 'REJECT'; role?: 'USER' | 'MANAGER' | 'SUPERADMIN' }>(event)
  if (!id || !action) throw createError({ statusCode: 400, message: 'Invalid request' })
  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
  const data: any = { status }
  if (action === 'APPROVE' && role) data.role = role
  await prisma.user.update({ where: { id }, data })
  return { ok: true }
})


