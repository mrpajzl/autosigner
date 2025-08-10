import { prisma } from '../utils/db'
import { registerUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const count = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
  if (count > 0) throw createError({ statusCode: 400, message: 'Superadmin exists' })
  const body = await readBody<{ email: string; password: string }>(event)
  if (!body?.email || !body?.password) throw createError({ statusCode: 400, message: 'Email/password required' })
  const user = await registerUser(body.email, body.password, 'SUPERADMIN')
  return { id: user.id }
})


