import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import plist from 'plist'
import { execa } from 'execa'

async function parseMobileProvision(buf: Buffer): Promise<{ uuid?: string; teamId?: string; expiresAt?: Date; name?: string }> {
  try {
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
    // Fetch all profiles from Apple
    const profiles = await api.listProfiles()
    
    // Filter to Ad Hoc and Development profiles that are active and not expired
    const now = new Date()
    const validProfiles = profiles.filter(p => {
      const isAdHocOrDev = p.attributes.profileType.includes('ADHOC') || p.attributes.profileType.includes('DEVELOPMENT')
      const isActive = p.attributes.profileState === 'ACTIVE'
      const expirationDate = new Date(p.attributes.expirationDate)
      const isNotExpired = expirationDate > now
      return isAdHocOrDev && isActive && isNotExpired
    })

    if (validProfiles.length === 0) {
      throw createError({
        statusCode: 404,
        message: 'No valid Ad Hoc or Development profiles found in your Apple Developer account.'
      })
    }

    // Sort by expiration date (latest expiring first = freshest)
    validProfiles.sort((a, b) => 
      new Date(b.attributes.expirationDate).getTime() - new Date(a.attributes.expirationDate).getTime()
    )

    // Group by platform
    const iosProfile = validProfiles.find(p => p.attributes.platform === 'IOS')
    const tvosProfile = validProfiles.find(p => p.attributes.platform === 'TVOS')

    const results: { ios?: any; tvos?: any } = {}

    // Download and activate iOS profile
    if (iosProfile) {
      const profileData = await api.downloadProfile(iosProfile.id)
      const meta = await parseMobileProvision(profileData)

      // Deactivate existing iOS profiles
      await prisma.provisioningProfile.updateMany({
        where: { userId: user.id, platform: 'IOS', active: true },
        data: { active: false }
      })

      // Create new profile and activate it
      const created = await prisma.provisioningProfile.create({
        data: {
          userId: user.id,
          platform: 'IOS',
          name: meta.name || iosProfile.attributes.name || null,
          uuid: meta.uuid || iosProfile.attributes.uuid || null,
          teamId: meta.teamId || null,
          expiresAt: meta.expiresAt || new Date(iosProfile.attributes.expirationDate),
          data: profileData,
          active: true
        }
      })

      results.ios = {
        id: created.id,
        name: created.name,
        uuid: created.uuid,
        expiresAt: created.expiresAt
      }
    }

    // Download and activate tvOS profile
    if (tvosProfile) {
      const profileData = await api.downloadProfile(tvosProfile.id)
      const meta = await parseMobileProvision(profileData)

      // Deactivate existing tvOS profiles
      await prisma.provisioningProfile.updateMany({
        where: { userId: user.id, platform: 'TVOS', active: true },
        data: { active: false }
      })

      // Create new profile and activate it
      const created = await prisma.provisioningProfile.create({
        data: {
          userId: user.id,
          platform: 'TVOS',
          name: meta.name || tvosProfile.attributes.name || null,
          uuid: meta.uuid || tvosProfile.attributes.uuid || null,
          teamId: meta.teamId || null,
          expiresAt: meta.expiresAt || new Date(tvosProfile.attributes.expirationDate),
          data: profileData,
          active: true
        }
      })

      results.tvos = {
        id: created.id,
        name: created.name,
        uuid: created.uuid,
        expiresAt: created.expiresAt
      }
    }

    return {
      success: true,
      message: `Synced ${results.ios ? 'iOS' : ''}${results.ios && results.tvos ? ' and ' : ''}${results.tvos ? 'tvOS' : ''} profiles`,
      profiles: results
    }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({
      statusCode: 500,
      message: `Failed to sync profiles: ${e.message}`
    })
  }
})




