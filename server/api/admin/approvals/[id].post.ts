import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  const id = getRouterParam(event, 'id')
  const { action } = await readBody<{ action: 'APPROVE' | 'REJECT' }>(event)
  if (!id || !action) throw createError({ statusCode: 400, message: 'Invalid request' })
  const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
  await prisma.user.update({ where: { id }, data: { status } })
  return { ok: true }
})


