import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { decrypt } from '../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../utils/apple-api'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  // Check if registered user exists and belongs to this owner
  const registeredUser = await prisma.registeredUser.findUnique({
    where: { id: userId },
    include: {
      devices: true
    }
  })

  if (!registeredUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (registeredUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  if (registeredUser.devices.length === 0) {
    return {
      success: true,
      registered: 0,
      alreadyRegistered: 0,
      failed: [],
      devices: []
    }
  }

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

  // Get currently registered Apple devices
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

  // Filter out already registered devices
  const unregisteredDevices = registeredUser.devices.filter(
    d => !appleDeviceUdids.has(d.udid.toLowerCase())
  )

  if (unregisteredDevices.length === 0) {
    return {
      success: true,
      registered: 0,
      alreadyRegistered: registeredUser.devices.length,
      failed: [],
      devices: []
    }
  }

  // Register devices with Apple
  const results: Array<{
    udid: string
    name: string
    success: boolean
    error?: string
    appleDeviceId?: string
  }> = []

  for (const device of unregisteredDevices) {
    try {
      // Use the device's name which is already in the unified format
      // Format: "Discord Name - Device Type Number"
      const appleDevice = await api.registerDevice(
        device.udid,
        device.name, // Already formatted as "John - iPhone 1"
        device.platform as 'IOS' | 'MAC_OS' | 'APPLE_TV'
      )
      
      // Store the Apple device ID for future syncing
      await prisma.userDevice.update({
        where: { id: device.id },
        data: { appleDeviceId: appleDevice.id }
      })
      
      results.push({
        udid: device.udid,
        name: device.name,
        success: true,
        appleDeviceId: appleDevice.id
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (e: any) {
      results.push({
        udid: device.udid,
        name: device.name,
        success: false,
        error: e.message
      })
    }
  }

  return {
    success: true,
    registered: results.filter(r => r.success).length,
    alreadyRegistered: registeredUser.devices.length - unregisteredDevices.length,
    failed: results.filter(r => !r.success),
    devices: results.filter(r => r.success)
  }
})

