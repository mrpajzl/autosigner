import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const query = getQuery(event)
  const includeAppleStatus = query.includeAppleStatus === 'true'

  // Fetch all registered users with their devices
  const registeredUsers = await prisma.registeredUser.findMany({
    where: { ownerId: user.id },
    include: {
      devices: {
        orderBy: { deviceNumber: 'asc' }
      },
      linkedUser: {
        select: {
          id: true,
          nickname: true,
          authProvider: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true
        }
      }
    },
    orderBy: { discordName: 'asc' }
  })

  // If Apple status is requested, fetch devices from Apple and compare
  let appleDeviceUdids: Set<string> = new Set()

  if (includeAppleStatus) {
    const credentials = await prisma.appleDeveloperCredentials.findUnique({
      where: { userId: user.id }
    })

    if (credentials) {
      try {
        const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()
        const api = new AppleDeveloperAPI({
          keyId: credentials.keyId,
          issuerId: credentials.issuerId,
          privateKey
        })
        const appleDevices = await api.listDevices()
        appleDeviceUdids = new Set(appleDevices.map(d => d.attributes.udid.toLowerCase()))
      } catch (e) {
        // If Apple API fails, just continue without status
        console.error('Failed to fetch Apple devices for status check:', e)
      }
    }
  }

  // Fetch Discord avatars for users with discordId but no linkedUser avatar
  const config = useRuntimeConfig()
  // @ts-ignore - process.env is available in Node.js runtime
  const botToken = config.discordBotToken || process.env.DISCORD_BOT_TOKEN

  // Transform the data with Apple registration status and Discord avatars
  const result = await Promise.all(registeredUsers.map(async (regUser) => {
    let discordAvatar: string | null = null

    // If user has linkedUser with avatar, use that
    if (regUser.linkedUser?.discordAvatar) {
      discordAvatar = regUser.linkedUser.discordAvatar
    } 
    // Otherwise, if user has discordId but no linkedUser avatar, fetch from Discord API
    else if (regUser.discordId && botToken) {
      try {
        const discordUser = await $fetch<{
          id: string
          username: string
          discriminator: string
          avatar: string | null
          global_name?: string | null
        }>(`https://discord.com/api/v10/users/${regUser.discordId}`, {
          headers: {
            Authorization: `Bot ${botToken}`
          }
        })

        if (discordUser.avatar) {
          const extension = discordUser.avatar.startsWith('a_') ? 'gif' : 'png'
          discordAvatar = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${extension}`
        }
      } catch (e) {
        // If we can't fetch, just continue without avatar
        console.error(`Failed to fetch Discord avatar for user ${regUser.discordId}:`, e)
      }
    }

    return {
      id: regUser.id,
      discordName: regUser.discordName,
      discordId: regUser.discordId,
      discordAvatar, // Add the fetched avatar
      notes: regUser.notes,
      paidForNextYear: regUser.paidForNextYear,
      createdAt: regUser.createdAt,
      updatedAt: regUser.updatedAt,
      devices: regUser.devices.map(device => ({
        id: device.id,
        udid: device.udid,
        name: device.name,
        deviceNumber: device.deviceNumber,
        platform: device.platform,
        appleDeviceId: device.appleDeviceId,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
        isRegisteredInApple: includeAppleStatus 
          ? appleDeviceUdids.has(device.udid.toLowerCase()) 
          : undefined
      })),
      deviceCount: regUser.devices.length,
      registeredInAppleCount: includeAppleStatus
        ? regUser.devices.filter(d => appleDeviceUdids.has(d.udid.toLowerCase())).length
        : undefined,
      linkedUser: regUser.linkedUser
        ? {
            id: regUser.linkedUser.id,
            nickname: regUser.linkedUser.nickname,
            authProvider: regUser.linkedUser.authProvider,
            discordId: regUser.linkedUser.discordId,
            discordUsername: regUser.linkedUser.discordUsername,
            discordAvatar: regUser.linkedUser.discordAvatar
          }
        : null
    }
  }))

  return result
})

