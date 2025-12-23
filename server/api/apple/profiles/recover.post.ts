import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { decrypt } from '../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../utils/apple-api'
import plist from 'plist'
import { execa } from 'execa'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Profile name is required'),
  bundleIdId: z.string().min(1, 'Bundle ID is required'),
  profileType: z.enum(['IOS_APP_DEVELOPMENT', 'IOS_APP_ADHOC', 'TVOS_APP_DEVELOPMENT', 'TVOS_APP_ADHOC']).default('IOS_APP_ADHOC')
})

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
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { name, bundleIdId, profileType } = parsed.data

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
    // Get enabled devices filtered by platform
    const allDevices = await api.listDevices()
    const isTvOS = profileType.startsWith('TVOS')
    
    // Filter devices by platform:
    // - tvOS profiles: only Apple TV devices (deviceClass === 'APPLE_TV')
    // - iOS profiles: iOS devices (iPhone/iPad) AND macOS devices (for Mac Catalyst / Apple Silicon Macs)
    const enabledDeviceIds = allDevices
      .filter(d => {
        if (d.attributes.status !== 'ENABLED') return false
        if (isTvOS) {
          // tvOS profiles only accept Apple TV devices
          return d.attributes.deviceClass === 'APPLE_TV'
        } else {
          // iOS profiles accept iOS devices (iPhone/iPad) and macOS devices, but NOT Apple TV
          return (d.attributes.platform === 'IOS' || d.attributes.platform === 'MAC_OS') 
            && d.attributes.deviceClass !== 'APPLE_TV'
        }
      })
      .map(d => d.id)

    if (enabledDeviceIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: `No enabled ${isTvOS ? 'tvOS (Apple TV)' : 'iOS (iPhone/iPad/Mac)'} devices found`
      })
    }

    // Get ALL signing certificates
    const allCerts = await api.getSigningCertificates()
    const certIds = allCerts.map(c => c.id)

    if (certIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No signing certificates found'
      })
    }

    // Create the profile
    const newProfile = await api.createProfile(
      name,
      bundleIdId,
      certIds,
      enabledDeviceIds,
      profileType
    )

    // Download the profile content
    const profileData = Buffer.from(newProfile.attributes.profileContent, 'base64')
    const meta = await parseMobileProvision(profileData)
    const platform = profileType.startsWith('TVOS') ? 'TVOS' : 'IOS'

    // Save to local database and activate
    const created = await prisma.provisioningProfile.create({
      data: {
        userId: user.id,
        platform,
        name: meta.name || name,
        uuid: meta.uuid || newProfile.attributes.uuid,
        teamId: meta.teamId || null,
        expiresAt: meta.expiresAt || new Date(newProfile.attributes.expirationDate),
        data: profileData
      }
    })

    // Deactivate other profiles for this platform and activate this one
    await prisma.provisioningProfile.updateMany({
      where: { userId: user.id, platform, active: true },
      data: { active: false }
    })
    await prisma.provisioningProfile.update({
      where: { id: created.id },
      data: { active: true }
    })

    // Trigger automatic re-signing for all apps using this profile
    const { triggerResignForUser } = await import('../../../utils/signer')
    ;(async () => {
      try {
        await triggerResignForUser(user.id, platform as 'IOS' | 'TVOS')
      } catch (e) {
        console.error('Failed to trigger automatic re-signing after profile recovery:', e)
      }
    })()

    return {
      success: true,
      appleProfileId: newProfile.id,
      devicesIncluded: enabledDeviceIds.length,
      certificatesIncluded: certIds.length,
      profile: {
        id: created.id,
        name: created.name,
        platform: created.platform,
        uuid: created.uuid,
        expiresAt: created.expiresAt,
        active: true
      }
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to create profile: ${e.message}`
    })
  }
})

