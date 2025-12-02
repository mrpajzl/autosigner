import { z } from 'zod'
import { login } from '../../utils/auth'

const schema = z.object({ nickname: z.string().min(1), password: z.string().min(8) })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid nickname or password format' })
  }
  const user = await login(event, result.data.nickname, result.data.password)
  return { id: user.id, role: user.role }
})


