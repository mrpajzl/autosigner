import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  const id = getRouterParam(event, 'id')
  const { role } = await readBody<{ role: 'MANAGER' | 'USER' }>(event)
  if (!id || !role) throw createError({ statusCode: 400, message: 'Invalid request' })
  await prisma.user.update({ where: { id }, data: { role } })
  return { ok: true }
})


