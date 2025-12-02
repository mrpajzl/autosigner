import { prisma } from '../utils/db'
import { createUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const count = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
    if (count > 0) throw createError({ statusCode: 400, message: 'Superadmin exists' })
    const body = await readBody<{ nickname: string; password: string }>(event)
    if (!body?.nickname || !body?.password) throw createError({ statusCode: 400, message: 'Nickname/password required' })
    const user = await createUser(body.nickname, body.password, 'SUPERADMIN')
    return { id: user.id }
  } catch (e: any) {
    console.error('bootstrap.superadmin failed', e)
    throw createError({ statusCode: e?.statusCode || 500, message: e?.message || 'Server Error' })
  }
})


