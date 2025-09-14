import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  const id = getRouterParam(event, 'id')
  const { role, status } = await readBody<{ role?: 'USER' | 'MANAGER' | 'SUPERADMIN'; status?: 'PENDING' | 'APPROVED' | 'REJECTED' }>(event)
  if (!id) throw createError({ statusCode: 400, message: 'Invalid request' })
  const data: any = {}
  if (role) data.role = role
  if (status) data.status = status
  if (Object.keys(data).length === 0) throw createError({ statusCode: 400, message: 'No changes provided' })
  await prisma.user.update({ where: { id }, data })
  return { ok: true }
})


