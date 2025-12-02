import { z } from 'zod'
import { login } from '../../utils/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email or password format' })
  }
  const user = await login(event, result.data.email, result.data.password)
  return { id: user.id, role: user.role }
})


