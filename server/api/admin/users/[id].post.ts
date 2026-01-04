import { prisma } from '../../../utils/db'
import { requireRole } from '../../../utils/auth'
import { z } from 'zod'

const schema = z.object({
  role: z.enum(['USER', 'MANAGER', 'SUPERADMIN']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  // Discord matching options
  discordId: z.string().optional(),
  discordUsername: z.string().optional(),
  discordAvatar: z.string().optional(),
  nickname: z.string().min(1).max(50).optional()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Invalid request' })

  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const { role, status, discordId, discordUsername, discordAvatar, nickname } = result.data

  const data: any = {}
  if (role) data.role = role
  if (status) data.status = status
  if (nickname) data.nickname = nickname

  // Handle Discord matching
  if (discordId) {
    // Check if another user with this Discord ID already exists
    const existingDiscordUser = await prisma.user.findUnique({
      where: { discordId }
    })

    if (existingDiscordUser && existingDiscordUser.id !== id) {
      throw createError({ statusCode: 409, message: 'A user with this Discord ID already exists' })
    }

    // Fetch full Discord info if needed
    let finalDiscordUsername = discordUsername
    let finalDiscordAvatar = discordAvatar

    if (!finalDiscordUsername || !finalDiscordAvatar) {
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
          // If we can't fetch, use provided values
        }
      }
    }

    data.discordId = discordId
    data.discordUsername = finalDiscordUsername
    data.discordAvatar = finalDiscordAvatar
    data.authProvider = 'discord'
  }

  if (Object.keys(data).length === 0) throw createError({ statusCode: 400, message: 'No changes provided' })

  await prisma.user.update({ where: { id }, data })
  return { ok: true }
})


