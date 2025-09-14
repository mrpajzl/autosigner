import { prisma } from '../../../utils/db'
import { requireAnyRole } from '../../../utils/auth'
import { signApp } from '../../../utils/signer'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const app = await prisma.app.findUnique({ where: { id } })
  if (!app) throw createError({ statusCode: 404, message: 'Not found' })
  if (user.role !== 'SUPERADMIN' && app.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  await prisma.app.update({ where: { id: app.id }, data: { status: 'SIGNING', signedAt: null } })

  ;(async () => {
    try {
      await signApp(app.id)
    } catch (e) {
      await prisma.app.update({ where: { id: app.id }, data: { status: 'FAILED' } })
      console.error('Manual resign failed', e)
    }
  })()

  return { ok: true }
})


