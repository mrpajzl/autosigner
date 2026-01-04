import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { z } from 'zod'

const schema = z.object({
  discordName: z.string().min(1, 'Discord name is required').max(100).optional(),
  discordId: z.string().nullable().optional(), // Discord ID for automatic linking
  notes: z.string().max(500).nullable().optional(),
  paidForNextYear: z.boolean().optional(),
  useCustomName: z.boolean().default(false) // If true, use provided discordName instead of Discord username
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  // Check if user exists and belongs to this owner
  const existing = await prisma.registeredUser.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (existing.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  let { discordName, discordId, notes, paidForNextYear, useCustomName } = parsed.data

  // Determine the Discord ID to use
  let finalDiscordId: string | null = discordId !== undefined ? (discordId || null) : existing.discordId
  let finalDiscordName = discordName || existing.discordName

  // If we have a Discord ID and useCustomName is false, fetch from Discord API
  // This handles both new Discord IDs and existing ones when removing custom name
  const shouldFetchFromDiscord = finalDiscordId && !useCustomName
  const discordIdToFetch = discordId !== undefined ? discordId : existing.discordId

  if (shouldFetchFromDiscord && discordIdToFetch) {
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
        }>(`https://discord.com/api/v10/users/${discordIdToFetch}`, {
          headers: {
            Authorization: `Bot ${botToken}`
          }
        })

        // Always use Discord username from API when useCustomName is false
        finalDiscordName = discordUser.discriminator !== '0' && discordUser.discriminator
          ? `${discordUser.username}#${discordUser.discriminator}`
          : discordUser.username
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
  } else if (useCustomName && discordName) {
    // If using custom name, use the provided name
    finalDiscordName = discordName
  }

  // If changing discord name, check for duplicates
  if (finalDiscordName !== existing.discordName) {
    const duplicate = await prisma.registeredUser.findUnique({
      where: {
        ownerId_discordName: {
          ownerId: user.id,
          discordName: finalDiscordName
        }
      }
    })
    if (duplicate && duplicate.id !== id) {
      throw createError({
        statusCode: 409,
        message: 'A user with this Discord name already exists'
      })
    }
  }

  const updateData: any = {
    ...(notes !== undefined && { notes }),
    ...(paidForNextYear !== undefined && { paidForNextYear })
  }

  // Always update discordName if useCustomName is explicitly set or discordName is provided
  // This ensures we update the name when removing custom name (useCustomName = false)
  if (useCustomName !== undefined || discordName !== undefined || discordId !== undefined) {
    updateData.discordName = finalDiscordName
  }

  // Update discordId if provided
  if (discordId !== undefined) {
    updateData.discordId = finalDiscordId
  }

  const updated = await prisma.registeredUser.update({
    where: { id },
    data: updateData,
    include: {
      devices: true
    }
  })

  // If Discord ID is provided or updated, try to link with existing Discord user
  if (finalDiscordId && (discordId !== undefined || !existing.linkedUserId)) {
    const discordUser = await prisma.user.findUnique({
      where: { discordId: finalDiscordId }
    })

    if (discordUser && (!existing.linkedUserId || existing.linkedUserId !== discordUser.id)) {
      // Link the registered user to the Discord user
      await prisma.registeredUser.update({
        where: { id },
        data: { linkedUserId: discordUser.id }
      })
    }
  } else if (discordId === null && existing.linkedUserId) {
    // Remove link if Discord ID is explicitly set to null
    await prisma.registeredUser.update({
      where: { id },
      data: { linkedUserId: null }
    })
  }

  return {
    id: updated.id,
    discordName: updated.discordName,
    discordId: updated.discordId,
    notes: updated.notes,
    paidForNextYear: updated.paidForNextYear,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    devices: updated.devices,
    deviceCount: updated.devices.length
  }
})

