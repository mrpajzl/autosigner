import { requireAnyRole } from '../../../../../utils/auth'
import { prisma } from '../../../../../utils/db'
import { decrypt } from '../../../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../../../utils/apple-api'
import { generateDeviceName, deviceClassToPlatform } from '../../../../../utils/device-naming'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const userId = getRouterParam(event, 'id')
  const deviceId = getRouterParam(event, 'deviceId')

  if (!userId || !deviceId) {
    throw createError({ statusCode: 400, message: 'User ID and Device ID are required' })
  }

  // Check if registered user exists and belongs to this owner
  const registeredUser = await prisma.registeredUser.findUnique({
    where: { id: userId }
  })

  if (!registeredUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (registeredUser.ownerId !== user.id) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Check if device exists
  const device = await prisma.userDevice.findUnique({
    where: { id: deviceId }
  })

  if (!device || device.registeredUserId !== userId) {
    throw createError({ statusCode: 404, message: 'Device not found' })
  }

  // Get Apple Developer credentials
  const credentials = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id }
  })

  if (!credentials) {
    throw createError({
      statusCode: 400,
      message: 'Apple Developer credentials not configured. Please connect your account first.'
    })
  }

  // Decrypt the private key
  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()

  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  try {
    // First, find the Apple device ID by UDID
    const appleDevices = await api.listDevices()
    const appleDevice = appleDevices.find(
      d => d.attributes.udid.toLowerCase() === device.udid.toLowerCase()
    )

    if (!appleDevice) {
      throw createError({
        statusCode: 404,
        message: 'Device not found in Apple Developer account. Please register it first.'
      })
    }

    // Determine the correct platform from Apple's deviceClass
    const correctPlatform = deviceClassToPlatform(appleDevice.attributes.deviceClass)

    // Generate the unified device name using the correct platform and deviceClass
    const newName = generateDeviceName(
      registeredUser.discordName,
      correctPlatform,
      device.deviceNumber,
      appleDevice.attributes.deviceClass
    )

    // Update the device name in Apple Developer Portal
    await api.updateDevice(appleDevice.id, newName)

    // Update our database with the correct platform and Apple device ID
    await prisma.userDevice.update({
      where: { id: deviceId },
      data: { 
        appleDeviceId: appleDevice.id,
        platform: correctPlatform,
        name: newName
      }
    })

    return {
      success: true,
      deviceName: newName,
      appleDeviceId: appleDevice.id,
      platform: correctPlatform,
      deviceClass: appleDevice.attributes.deviceClass
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to sync device name to Apple: ${e.message}`
    })
  }
})
