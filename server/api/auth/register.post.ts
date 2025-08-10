import { z } from 'zod'
import { registerUser } from '../../utils/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const input = schema.parse(body)
  const user = await registerUser(input.email, input.password, 'MANAGER')
  return { id: user.id, status: user.status }
})


