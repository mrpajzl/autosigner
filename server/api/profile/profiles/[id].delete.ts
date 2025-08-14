import { requireUser } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })
  const prof = await prisma.provisioningProfile.findUnique({ where: { id } })
  if (!prof || prof.userId !== user.id) throw createError({ statusCode: 404 })
  await prisma.provisioningProfile.delete({ where: { id } })
  return { ok: true }
})


