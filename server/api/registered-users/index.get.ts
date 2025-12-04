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
        orderBy: { createdAt: 'desc' }
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

  // Transform the data with Apple registration status
  return registeredUsers.map(regUser => ({
    id: regUser.id,
    discordName: regUser.discordName,
    notes: regUser.notes,
    createdAt: regUser.createdAt,
    updatedAt: regUser.updatedAt,
    devices: regUser.devices.map(device => ({
      id: device.id,
      udid: device.udid,
      name: device.name,
      platform: device.platform,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      isRegisteredInApple: includeAppleStatus 
        ? appleDeviceUdids.has(device.udid.toLowerCase()) 
        : undefined
    })),
    deviceCount: regUser.devices.length,
    registeredInAppleCount: includeAppleStatus
      ? regUser.devices.filter(d => appleDeviceUdids.has(d.udid.toLowerCase())).length
      : undefined
  }))
})

