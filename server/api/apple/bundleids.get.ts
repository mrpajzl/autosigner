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
    const bundleIds = await api.listBundleIds()

    // Transform to a cleaner format
    return bundleIds.map(b => ({
      id: b.id,
      identifier: b.attributes.identifier,
      name: b.attributes.name,
      platform: b.attributes.platform,
      seedId: b.attributes.seedId
    }))
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch bundle IDs from Apple: ${e.message}`
    })
  }
})

