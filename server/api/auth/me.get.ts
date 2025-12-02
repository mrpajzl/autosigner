import { getSessionUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) return null
  return { id: user.id, nickname: user.nickname, role: user.role, status: user.status }
})


