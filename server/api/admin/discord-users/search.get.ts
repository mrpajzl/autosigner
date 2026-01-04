import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  global_name?: string | null
}

/**
 * Search for Discord users using Discord API.
 * Prioritizes Discord API search over database search.
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const { q } = getQuery(event)
  const query = typeof q === 'string' ? q.trim() : ''

  if (!query) {
    return []
  }

  const results: Array<{
    id: string
    username: string
    nickname?: string
    avatar?: string | null
    source: 'database' | 'discord_api'
  }> = []

  const config = useRuntimeConfig()
  const botToken = config.discordBotToken || process.env.DISCORD_BOT_TOKEN
  const guildId = config.discordGuildId || process.env.DISCORD_GUILD_ID

  // PRIORITY 1: If query looks like a Discord ID (18-19 digit number), fetch directly from Discord API
  if (/^\d{17,19}$/.test(query)) {
    if (botToken) {
      try {
        const discordUser = await $fetch<DiscordUser>(`https://discord.com/api/v10/users/${query}`, {
          headers: {
            Authorization: `Bot ${botToken}`
          }
        })

        const username = discordUser.discriminator !== '0' && discordUser.discriminator
          ? `${discordUser.username}#${discordUser.discriminator}`
          : discordUser.username

        results.push({
          id: discordUser.id,
          username,
          avatar: discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null,
          source: 'discord_api'
        })

        // Return early if we found a user by ID
        return results
      } catch (e: any) {
        // User not found or bot doesn't have access - continue to other search methods
      }
    }
  }

  // PRIORITY 2: Search guild members using Discord API (if bot token and guild ID are available)
  if (botToken && guildId) {
    try {
      // Search guild members by username/nickname
      // This searches both username and nickname in the guild
      const members = await $fetch<Array<{
        user: DiscordUser
        nick?: string | null
      }>>(`https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=20`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      })

      for (const member of members) {
        const discordUser = member.user
        // Check if we already have this user in results
        if (!results.some(r => r.id === discordUser.id)) {
          const username = discordUser.discriminator !== '0' && discordUser.discriminator
            ? `${discordUser.username}#${discordUser.discriminator}`
            : discordUser.username

          results.push({
            id: discordUser.id,
            username,
            nickname: member.nick || undefined,
            avatar: discordUser.avatar
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
            source: 'discord_api'
          })
        }
      }
    } catch (e: any) {
      // Guild search failed - might not have permissions or guild not configured
      // Continue to database search as fallback
    }
  }

  // PRIORITY 3: Fallback to database search (only if Discord API didn't return results or isn't configured)
  if (results.length === 0) {
    const dbUsers = await prisma.user.findMany({
      where: {
        authProvider: 'discord',
        OR: [
          { nickname: { contains: query, mode: 'insensitive' } },
          { discordUsername: { contains: query, mode: 'insensitive' } },
          { discordId: query }
        ]
      },
      select: {
        id: true,
        nickname: true,
        discordId: true,
        discordUsername: true,
        discordAvatar: true
      },
      take: 20
    })

    for (const user of dbUsers) {
      if (user.discordId) {
        // Check if we already have this user from Discord API
        if (!results.some(r => r.id === user.discordId)) {
          results.push({
            id: user.discordId,
            username: user.discordUsername || user.nickname,
            nickname: user.nickname,
            avatar: user.discordAvatar,
            source: 'database'
          })
        }
      }
    }
  }

  return results.slice(0, 20) // Limit total results
})
