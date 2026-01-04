import { requireAnyRole } from '../../../utils/auth'

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  global_name?: string | null
}

/**
 * Fetch Discord user details by ID using Discord API
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Discord user ID is required' })
  }

  // Validate Discord ID format (18-19 digits)
  if (!/^\d{17,19}$/.test(id)) {
    throw createError({ statusCode: 400, message: 'Invalid Discord user ID format' })
  }

  const config = useRuntimeConfig()
  const botToken = config.discordBotToken || process.env.DISCORD_BOT_TOKEN

  if (!botToken) {
    throw createError({ statusCode: 500, message: 'Discord bot token not configured' })
  }

  try {
    const discordUser = await $fetch<DiscordUser>(`https://discord.com/api/v10/users/${id}`, {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    })

    const username = discordUser.discriminator !== '0' && discordUser.discriminator
      ? `${discordUser.username}#${discordUser.discriminator}`
      : discordUser.username

    // Build avatar URL - handle animated avatars (start with "a_")
    let avatarUrl: string | null = null
    if (discordUser.avatar) {
      const extension = discordUser.avatar.startsWith('a_') ? 'gif' : 'png'
      avatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${extension}`
    }

    return {
      id: discordUser.id,
      username,
      avatar: avatarUrl,
      globalName: discordUser.global_name
    }
  } catch (e: any) {
    if (e.statusCode === 404) {
      throw createError({ statusCode: 404, message: 'Discord user not found' })
    }
    throw createError({ statusCode: 500, message: 'Failed to fetch Discord user: ' + (e.message || 'Unknown error') })
  }
})
