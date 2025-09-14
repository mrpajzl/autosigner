import { z } from 'zod'
import { registerUser } from '../../utils/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const input = schema.parse(body)
    const user = await registerUser(input.email, input.password, 'USER')
    return { id: user.id, status: user.status }
  } catch (e: any) {
    if (e?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Email already registered' })
    }
    throw createError({ statusCode: e?.statusCode || 500, message: e?.message || 'Server Error' })
  }
})


