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
    const certificates = await api.getSigningCertificates()

    // Transform to a cleaner format
    return certificates.map(c => ({
      id: c.id,
      name: c.attributes.name,
      displayName: c.attributes.displayName,
      certificateType: c.attributes.certificateType,
      serialNumber: c.attributes.serialNumber,
      platform: c.attributes.platform,
      expirationDate: c.attributes.expirationDate
    }))
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch certificates from Apple: ${e.message}`
    })
  }
})

