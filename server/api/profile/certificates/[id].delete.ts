import { requireUser } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })
  const cert = await prisma.certificate.findUnique({ where: { id } })
  if (!cert || cert.userId !== user.id) throw createError({ statusCode: 404 })
  await prisma.certificate.delete({ where: { id } })
  return { ok: true }
})


