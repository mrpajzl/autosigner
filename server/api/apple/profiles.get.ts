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
    const profiles = await api.listProfiles()

    // Transform to a cleaner format
    return profiles.map(p => ({
      id: p.id,
      name: p.attributes.name,
      platform: p.attributes.platform,
      profileType: p.attributes.profileType,
      profileState: p.attributes.profileState,
      uuid: p.attributes.uuid,
      createdDate: p.attributes.createdDate,
      expirationDate: p.attributes.expirationDate,
      certificateCount: p.relationships?.certificates?.data?.length || 0
    }))
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch profiles from Apple: ${e.message}`
    })
  }
})


