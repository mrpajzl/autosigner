// Temporary endpoint to check Discord user info
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  
  return {
    userId: user.id,
    nickname: user.nickname,
    authProvider: user.authProvider,
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    hasDiscordUsername: !!user.discordUsername,
    message: user.discordUsername 
      ? 'Discord info looks good!' 
      : 'discordUsername is missing - please sign out and sign in again with Discord'
  }
})

