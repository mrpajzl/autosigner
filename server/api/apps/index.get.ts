import { prisma } from '../../utils/db'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const apps = await prisma.app.findMany({ where: { ownerId: user.id }, orderBy: { uploadedAt: 'desc' } })
  return apps
})


