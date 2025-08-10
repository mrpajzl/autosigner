import { requireUser } from '../../utils/auth'
import { prisma } from '../../utils/db'
import fse from 'fs-extra'
import path from 'node:path'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const app = await prisma.app.findUnique({ where: { id } })
  if (!app || app.ownerId !== user.id) throw createError({ statusCode: 404, message: 'Not found' })

  // Remove files
  const userDir = path.join(process.cwd(), 'public', 'uploads', user.id)
  const appDir = path.join(userDir, app.id)
  await fse.remove(appDir).catch(() => {})

  // Keep original IPA or remove? We'll remove only artifacts directory above.

  await prisma.app.delete({ where: { id: app.id } })
  return { ok: true }
})


