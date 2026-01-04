import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { deviceClassToPlatform } from '../../utils/device-naming'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const query = getQuery(event)
  const udid = query.udid as string

  if (!udid || typeof udid !== 'string') {
    throw createError({ statusCode: 400, message: 'UDID is required' })
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

  try {
    // Fetch all devices from Apple
    const appleDevices = await api.listDevices()
    
    // Find the device by UDID
    const device = appleDevices.find(
      d => d.attributes.udid.toLowerCase() === udid.toLowerCase()
    )

    if (!device) {
      return {
        found: false,
        message: 'Device not found in Apple Developer account'
      }
    }

    // Determine the correct platform from deviceClass
    const platform = deviceClassToPlatform(device.attributes.deviceClass)

    return {
      found: true,
      udid: device.attributes.udid,
      name: device.attributes.name,
      platform,
      deviceClass: device.attributes.deviceClass,
      appleDeviceId: device.id,
      model: device.attributes.model,
      status: device.attributes.status
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to detect device: ${e.message}`
    })
  }
})
