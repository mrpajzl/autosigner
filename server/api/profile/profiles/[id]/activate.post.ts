import { requireUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { triggerResignForUser } from '../../../../utils/signer'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400 })

  const prof = await prisma.provisioningProfile.findUnique({ where: { id } })
  if (!prof || prof.userId !== user.id) throw createError({ statusCode: 404 })

  await prisma.$transaction([
    prisma.provisioningProfile.updateMany({ where: { userId: user.id, platform: prof.platform, active: true }, data: { active: false } }),
    prisma.provisioningProfile.update({ where: { id }, data: { active: true } })
  ])

  ;(async () => { try { await triggerResignForUser(user.id, prof.platform as 'IOS' | 'TVOS') } catch {} })()
  return { ok: true }
})


