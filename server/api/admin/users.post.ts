import { z } from 'zod'
import { requireRole, createUser } from '../../utils/auth'
import { prisma } from '../../utils/db'

const schema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['USER', 'MANAGER', 'SUPERADMIN']).default('MANAGER'),
  // Discord matching options
  discordId: z.string().optional(),
  discordUsername: z.string().optional(),
  discordAvatar: z.string().optional(),
  useCustomNickname: z.boolean().default(false) // If true, use provided nickname instead of Discord username
})

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')

  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const { nickname, password, role, discordId, discordUsername, discordAvatar, useCustomNickname } = result.data

  // If Discord info is provided, use it as primary source
  let finalNickname: string
  let finalPassword: string | null = password || null
  let finalDiscordId: string | null = discordId || null
  let finalDiscordUsername: string | null = discordUsername || null
  let finalDiscordAvatar: string | null = discordAvatar || null
  let authProvider: 'local' | 'discord' = 'local'

  if (discordId) {
    // Check if user with this Discord ID already exists
    const existingDiscordUser = await prisma.user.findUnique({
      where: { discordId }
    })

    if (existingDiscordUser) {
      throw createError({ statusCode: 409, message: 'A user with this Discord ID already exists' })
    }

    // If Discord user is provided, fetch full info if needed
    if (!discordUsername || !discordAvatar) {
      const config = useRuntimeConfig()
      const botToken = config.discordBotToken || process.env.DISCORD_BOT_TOKEN
      if (botToken) {
        try {
          const discordUser = await $fetch<{
            id: string
            username: string
            discriminator: string
            avatar: string | null
            global_name?: string | null
          }>(`https://discord.com/api/v10/users/${discordId}`, {
            headers: {
              Authorization: `Bot ${botToken}`
            }
          })

          finalDiscordUsername = discordUser.discriminator !== '0' && discordUser.discriminator
            ? `${discordUser.username}#${discordUser.discriminator}`
            : discordUser.username
          finalDiscordAvatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : null
        } catch (e) {
          // If we can't fetch, use provided values or defaults
        }
      }
    }

    // Use Discord username as nickname unless custom nickname is provided
    if (useCustomNickname && nickname) {
      finalNickname = nickname
    } else if (finalDiscordUsername) {
      finalNickname = finalDiscordUsername
      // Ensure uniqueness
      let counter = 1
      let uniqueNickname = finalNickname
      while (await prisma.user.findUnique({ where: { nickname: uniqueNickname } })) {
        uniqueNickname = `${finalNickname}_${counter}`
        counter++
      }
      finalNickname = uniqueNickname
    } else {
      throw createError({ statusCode: 400, message: 'Discord username is required when using Discord ID' })
    }

    authProvider = 'discord'
  } else {
    // Traditional local user creation
    if (!nickname) {
      throw createError({ statusCode: 400, message: 'Nickname is required when not using Discord' })
    }
    if (!password) {
      throw createError({ statusCode: 400, message: 'Password is required when not using Discord' })
    }
    finalNickname = nickname
  }

  try {
    const user = await createUser(finalNickname, finalPassword || '', role, {
      discordId: finalDiscordId,
      discordUsername: finalDiscordUsername,
      discordAvatar: finalDiscordAvatar,
      authProvider
    })
    return { id: user.id, nickname: user.nickname, role: user.role, authProvider: user.authProvider }
  } catch (e: any) {
    if (e?.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Nickname already taken' })
    }
    throw createError({ statusCode: 500, message: e?.message || 'Server Error' })
  }
})




