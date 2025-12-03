import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { storage } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const app = await prisma.app.findUnique({ where: { id } })
  if (!app || app.ownerId !== user.id) throw createError({ statusCode: 404, message: 'Not found' })

  // Remove files
  await storage.deletePrefix(`/uploads/${user.id}/${app.id}`).catch(() => {})

  // Keep original IPA or remove? We'll remove only artifacts directory above.

  await prisma.app.delete({ where: { id: app.id } })
  return { ok: true }
})


