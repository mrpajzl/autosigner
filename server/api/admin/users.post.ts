import { z } from 'zod'
import { requireRole, createUser } from '../../utils/auth'

const schema = z.object({
  nickname: z.string().min(1).max(50),
  password: z.string().min(8),
  role: z.enum(['USER', 'MANAGER', 'SUPERADMIN']).default('MANAGER')
})

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')

  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  try {
    const user = await createUser(result.data.nickname, result.data.password, result.data.role)
    return { id: user.id, nickname: user.nickname, role: user.role }
  } catch (e: any) {
    if (e?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Nickname already taken' })
    }
    throw createError({ statusCode: 500, message: e?.message || 'Server Error' })
  }
})




