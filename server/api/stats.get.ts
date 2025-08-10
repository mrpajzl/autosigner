import { prisma } from '../utils/db'
import { requireUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const [apps, signed] = await Promise.all([
    prisma.app.count({ where: { ownerId: user.id } }),
    prisma.app.count({ where: { ownerId: user.id, status: 'SIGNED' } })
  ])
  return { apps, signed }
})


