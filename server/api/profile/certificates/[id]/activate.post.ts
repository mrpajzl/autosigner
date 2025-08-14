import { requireUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { triggerResignForUser } from '../../../../utils/signer'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })

  // Deactivate others, activate this one
  await prisma.$transaction([
    prisma.certificate.updateMany({ where: { userId: user.id, active: true }, data: { active: false } }),
    prisma.certificate.update({ where: { id }, data: { active: true } })
  ])

  ;(async () => {
    try { await triggerResignForUser(user.id) } catch {}
  })()
  return { ok: true }
})


