import { requireAnyRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { decrypt } from '../../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../../utils/apple-api'
import plist from 'plist'
import { execa } from 'execa'

async function parseMobileProvision(buf: Buffer): Promise<{ uuid?: string; teamId?: string; expiresAt?: Date; name?: string }> {
  try {
    // mobileprovision is a CMS (pkcs7) wrapper around a plist; use openssl to extract
    const { stdout } = await execa('bash', ['-lc', 'openssl smime -inform der -verify -noverify -in /dev/stdin -out /dev/stdout'], { input: buf })
    const obj = plist.parse(stdout) as any
    const uuid = obj?.UUID as string | undefined
    const teamId = Array.isArray(obj?.TeamIdentifier) ? obj.TeamIdentifier[0] : obj?.TeamIdentifier
    const expiresAt = obj?.ExpirationDate ? new Date(obj.ExpirationDate) : undefined
    const name = obj?.Name as string | undefined
    return { uuid, teamId, expiresAt, name }
  } catch {
    return {}
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const profileId = getRouterParam(event, 'id')

  if (!profileId) {
    throw createError({ statusCode: 400, message: 'Profile ID is required' })
  }

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
    // Download the profile from Apple
    const profileData = await api.downloadProfile(profileId)
    
    // Parse the profile to get metadata
    const meta = await parseMobileProvision(profileData)

    // Determine platform based on profile type from Apple
    const appleProfile = await api.getProfile(profileId)
    const platform = appleProfile.attributes.platform === 'TVOS' ? 'TVOS' : 'IOS'

    // Save to local database
    const created = await prisma.provisioningProfile.create({
      data: {
        userId: user.id,
        platform,
        name: meta.name || appleProfile.attributes.name || null,
        uuid: meta.uuid || appleProfile.attributes.uuid || null,
        teamId: meta.teamId || null,
        expiresAt: meta.expiresAt || (appleProfile.attributes.expirationDate ? new Date(appleProfile.attributes.expirationDate) : null),
        data: profileData
      }
    })

    return {
      success: true,
      profile: {
        id: created.id,
        name: created.name,
        platform: created.platform,
        uuid: created.uuid,
        teamId: created.teamId,
        expiresAt: created.expiresAt
      }
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to download profile: ${e.message}`
    })
  }
})

