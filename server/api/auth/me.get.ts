import { getSessionUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) return null
  const profile = await prisma.managerProfile.findUnique({ where: { userId: user.id } })
  const nickname = profile?.displayName || null
  return { id: user.id, email: user.email, role: user.role, status: user.status, nickname }
})


