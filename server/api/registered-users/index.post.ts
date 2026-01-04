import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { z } from 'zod'

const schema = z.object({
  discordName: z.string().min(1, 'Discord name is required').max(100).optional(), // Optional when Discord ID is provided
  discordId: z.string().optional(), // Optional Discord ID for automatic linking
  notes: z.string().max(500).optional(),
  useCustomName: z.boolean().default(false) // If true, use provided discordName instead of Discord username
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  let { discordName, discordId, notes, useCustomName } = parsed.data

  // If Discord ID is provided, always fetch and use info from Discord API
  let finalDiscordId: string | null = discordId || null
  let finalDiscordName: string | null = discordName || null

  if (discordId) {
    const config = useRuntimeConfig()
    // @ts-ignore - process.env is available in Node.js runtime
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

        // Always use Discord username from API unless custom name is explicitly requested
        if (!useCustomName) {
          finalDiscordName = discordUser.discriminator !== '0' && discordUser.discriminator
            ? `${discordUser.username}#${discordUser.discriminator}`
            : discordUser.username
        } else if (!finalDiscordName || !finalDiscordName.trim()) {
          // If custom name is requested but not provided, use Discord username
          finalDiscordName = discordUser.discriminator !== '0' && discordUser.discriminator
            ? `${discordUser.username}#${discordUser.discriminator}`
            : discordUser.username
        }
        // Ensure we use the correct Discord ID from the API response
        finalDiscordId = discordUser.id
      } catch (e: any) {
        // If we can't fetch from Discord API, throw an error
        throw createError({
          statusCode: 400,
          message: `Failed to fetch Discord user: ${e.message || 'Discord user not found or bot token invalid'}`
        })
      }
    } else {
      throw createError({
        statusCode: 500,
        message: 'Discord bot token not configured. Cannot verify Discord user ID.'
      })
    }
  }

  // Validate that we have a Discord name
  if (!finalDiscordName || !finalDiscordName.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Discord name is required. Either provide a Discord ID or a custom Discord name.'
    })
  }

  // Check if user with this discord name already exists for this owner
  const existing = await prisma.registeredUser.findUnique({
    where: {
      ownerId_discordName: {
        ownerId: user.id,
        discordName: finalDiscordName
      }
    }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'A user with this Discord name already exists'
    })
  }

  const registeredUser = await prisma.registeredUser.create({
    data: {
      ownerId: user.id,
      discordName: finalDiscordName,
      discordId: finalDiscordId,
      notes
    },
    include: {
      devices: true
    }
  })

  // If Discord ID is provided, try to link with existing Discord user
  if (finalDiscordId) {
    const discordUser = await prisma.user.findUnique({
      where: { discordId: finalDiscordId }
    })

    if (discordUser) {
      // Link the registered user to the Discord user
      await prisma.registeredUser.update({
        where: { id: registeredUser.id },
        data: { linkedUserId: discordUser.id }
      })
    }
  }

  return {
    id: registeredUser.id,
    discordName: registeredUser.discordName,
    discordId: registeredUser.discordId,
    notes: registeredUser.notes,
    createdAt: registeredUser.createdAt,
    updatedAt: registeredUser.updatedAt,
    devices: registeredUser.devices,
    deviceCount: 0
  }
})

