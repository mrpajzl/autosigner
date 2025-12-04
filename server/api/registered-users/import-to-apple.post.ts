import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { z } from 'zod'

const schema = z.object({
  userIds: z.array(z.string()).optional(),
  deviceIds: z.array(z.string()).optional(),
  all: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { userIds, deviceIds, all } = parsed.data

  // Get Apple credentials
  const credentials = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id }
  })

  if (!credentials) {
    throw createError({
      statusCode: 400,
      message: 'Apple Developer credentials not configured'
    })
  }

  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()
  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  // Get currently registered Apple devices to avoid duplicates
  let appleDeviceUdids: Set<string>
  try {
    const appleDevices = await api.listDevices()
    appleDeviceUdids = new Set(appleDevices.map(d => d.attributes.udid.toLowerCase()))
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch devices from Apple: ${e.message}`
    })
  }

  // Get devices to import
  let devicesToImport: Array<{
    id: string
    udid: string
    name: string
    platform: string
    discordName: string
  }> = []

  if (deviceIds && deviceIds.length > 0) {
    // Import specific devices
    const devices = await prisma.userDevice.findMany({
      where: {
        id: { in: deviceIds },
        registeredUser: {
          ownerId: user.id
        }
      },
      include: {
        registeredUser: true
      }
    })
    devicesToImport = devices.map(d => ({
      id: d.id,
      udid: d.udid,
      name: d.name,
      platform: d.platform,
      discordName: d.registeredUser.discordName
    }))
  } else if (userIds && userIds.length > 0) {
    // Import all devices from specific users
    const devices = await prisma.userDevice.findMany({
      where: {
        registeredUser: {
          id: { in: userIds },
          ownerId: user.id
        }
      },
      include: {
        registeredUser: true
      }
    })
    devicesToImport = devices.map(d => ({
      id: d.id,
      udid: d.udid,
      name: d.name,
      platform: d.platform,
      discordName: d.registeredUser.discordName
    }))
  } else if (all) {
    // Import all unregistered devices
    const devices = await prisma.userDevice.findMany({
      where: {
        registeredUser: {
          ownerId: user.id
        }
      },
      include: {
        registeredUser: true
      }
    })
    devicesToImport = devices.map(d => ({
      id: d.id,
      udid: d.udid,
      name: d.name,
      platform: d.platform,
      discordName: d.registeredUser.discordName
    }))
  } else {
    throw createError({
      statusCode: 400,
      message: 'Please specify userIds, deviceIds, or set all: true'
    })
  }

  // Filter out devices already registered in Apple
  const unregisteredDevices = devicesToImport.filter(
    d => !appleDeviceUdids.has(d.udid.toLowerCase())
  )

  if (unregisteredDevices.length === 0) {
    return {
      success: true,
      registered: 0,
      alreadyRegistered: devicesToImport.length,
      failed: [],
      devices: []
    }
  }

  // Register devices with Apple (with rate limiting)
  const results: Array<{
    udid: string
    name: string
    discordName: string
    success: boolean
    error?: string
  }> = []

  for (const device of unregisteredDevices) {
    try {
      // Format device name to include discord name for clarity
      const deviceName = `${device.discordName} - ${device.name}`
      
      await api.registerDevice(
        device.udid,
        deviceName,
        device.platform as 'IOS' | 'MAC_OS'
      )
      
      results.push({
        udid: device.udid,
        name: device.name,
        discordName: device.discordName,
        success: true
      })

      // Small delay to avoid rate limiting (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (e: any) {
      results.push({
        udid: device.udid,
        name: device.name,
        discordName: device.discordName,
        success: false,
        error: e.message
      })
    }
  }

  return {
    success: true,
    registered: results.filter(r => r.success).length,
    alreadyRegistered: devicesToImport.length - unregisteredDevices.length,
    failed: results.filter(r => !r.success),
    devices: results.filter(r => r.success)
  }
})

