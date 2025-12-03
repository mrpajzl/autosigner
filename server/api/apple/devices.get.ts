import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

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
    const devices = await api.listDevices()

    // Transform to a cleaner format
    return devices.map(d => ({
      id: d.id,
      name: d.attributes.name,
      udid: d.attributes.udid,
      platform: d.attributes.platform,
      deviceClass: d.attributes.deviceClass,
      status: d.attributes.status,
      model: d.attributes.model,
      addedDate: d.attributes.addedDate
    }))
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch devices from Apple: ${e.message}`
    })
  }
})


