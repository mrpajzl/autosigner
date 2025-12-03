import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const existing = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'No Apple Developer credentials found' })
  }

  await prisma.appleDeveloperCredentials.delete({
    where: { userId: user.id }
  })

  return { success: true }
})

