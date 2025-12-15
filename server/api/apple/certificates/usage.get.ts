import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { decrypt } from '../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../utils/apple-api'

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

  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()

  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  try {
    const [certificates, profiles] = await Promise.all([
      api.getSigningCertificates(),
      api.listProfiles()
    ])

    // Build a lookup of certificate ID -> profiles that reference it
    const usageMap = new Map<string, any[]>()

    for (const profile of profiles) {
      const certRels = profile.relationships?.certificates?.data || []
      for (const rel of certRels) {
        if (!usageMap.has(rel.id)) {
          usageMap.set(rel.id, [])
        }
        usageMap.get(rel.id)!.push({
          id: profile.id,
          name: profile.attributes.name,
          platform: profile.attributes.platform,
          profileType: profile.attributes.profileType,
          profileState: profile.attributes.profileState,
          uuid: profile.attributes.uuid,
          expirationDate: profile.attributes.expirationDate
        })
      }
    }

    return certificates.map(c => ({
      id: c.id,
      name: c.attributes.name,
      displayName: c.attributes.displayName,
      certificateType: c.attributes.certificateType,
      serialNumber: c.attributes.serialNumber,
      platform: c.attributes.platform,
      expirationDate: c.attributes.expirationDate,
      usedByProfiles: usageMap.get(c.id) || []
    }))
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch certificates from Apple: ${e.message}`
    })
  }
})


