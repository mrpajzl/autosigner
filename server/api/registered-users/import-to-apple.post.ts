import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { z } from 'zod'

const schema = z.object({
  userIds: z.array(z.string()).optional(),
  deviceIds: z.array(z.string()).optional(),
  all: z.boolean().optional(),
  onlyPaid: z.boolean().optional(),
  dryRun: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { userIds, deviceIds, all, onlyPaid, dryRun } = parsed.data

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

  const whereCondition: any = {
    registeredUser: {
      ownerId: user.id
    }
  }

  // Apply paid filter if requested
  if (onlyPaid) {
    whereCondition.registeredUser.paidForNextYear = true
  }

  if (deviceIds && deviceIds.length > 0) {
    // Import specific devices
    whereCondition.id = { in: deviceIds }
    const devices = await prisma.userDevice.findMany({
      where: whereCondition,
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
    whereCondition.registeredUser.id = { in: userIds }
    const devices = await prisma.userDevice.findMany({
      where: whereCondition,
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
      where: whereCondition,
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

  // If dry run, simply return the list of devices that WOULD be imported
  if (dryRun) {
    return {
      success: true,
      registered: 0,
      alreadyRegistered: devicesToImport.length - unregisteredDevices.length,
      failed: [],
      devices: unregisteredDevices,
      totalToImport: unregisteredDevices.length
    }
  }

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

      // Map APPLE_TV to IOS for Apple API as it doesn't support APPLE_TV platform type explicitly
      // but treats tvOS devices as part of the iOS family for registration
      const applePlatform = device.platform === 'APPLE_TV' ? 'IOS' : device.platform

      await api.registerDevice(
        device.udid,
        deviceName,
        applePlatform as 'IOS' | 'MAC_OS'
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

