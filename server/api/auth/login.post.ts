import { z } from 'zod'
import { login } from '../../utils/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const input = schema.parse(body)
  const user = await login(event, input.email, input.password)
  return { id: user.id, role: user.role }
})


