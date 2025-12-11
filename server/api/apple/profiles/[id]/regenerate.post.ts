import { requireAnyRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { decrypt } from '../../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../../utils/apple-api'
import plist from 'plist'
import { execa } from 'execa'
import { z } from 'zod'

const schema = z.object({
  activateAfter: z.boolean().default(false) // Whether to set as active profile after regeneration
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
  const profileId = getRouterParam(event, 'id')
  const body = await readBody(event).catch(() => ({}))

  const parsed = schema.safeParse(body)
  const activateAfter = parsed.success ? parsed.data.activateAfter : false

  if (!profileId) {
    throw createError({ statusCode: 400, message: 'Profile ID is required' })
  }

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
    // Get current profile details from Apple
    const existingProfile = await api.getProfile(profileId)
    
    // Get devices filtered by platform
    const allDevices = await api.listDevices()
    const isTvOS = existingProfile.attributes.profileType.startsWith('TVOS')
    
    // Filter devices by platform:
    // - tvOS profiles: only Apple TV devices (deviceClass === 'APPLE_TV')
    // - iOS profiles: only iOS devices (platform === 'IOS') BUT exclude Apple TV
    const enabledDeviceIds = allDevices
      .filter(d => {
        if (d.attributes.status !== 'ENABLED') return false
        if (isTvOS) {
          // tvOS profiles only accept Apple TV devices
          return d.attributes.deviceClass === 'APPLE_TV'
        } else {
          // iOS profiles accept iOS devices but NOT Apple TV
          return d.attributes.platform === 'IOS' && d.attributes.deviceClass !== 'APPLE_TV'
        }
      })
      .map(d => d.id)

    if (enabledDeviceIds.length === 0) {
      throw createError({
        statusCode: 400,
        message: `No enabled ${isTvOS ? 'tvOS (Apple TV)' : 'iOS (iPhone/iPad)'} devices found to add to profile`
      })
    }

    // Get bundle ID and certificates for the profile
    // We need to fetch with includes to get relationships
    const profileWithRelations = await fetchProfileWithRelations(api, profileId)

    // IMPORTANT: Create new profile FIRST before deleting the old one
    // This way if creation fails, the old profile is still intact
    // Strip any existing "(Updated ...)" suffix before adding the new one
    const baseName = existingProfile.attributes.name.replace(/\s*\(Updated [^)]+\)/g, '')
    const newProfileName = `${baseName} (Updated ${new Date().toLocaleDateString()})`
    
    // Create new profile with ALL enabled devices
    const newProfile = await api.createProfile(
      newProfileName,
      profileWithRelations.bundleIdId,
      profileWithRelations.certificateIds,
      enabledDeviceIds,
      existingProfile.attributes.profileType as any
    )

    // Only delete the old profile AFTER the new one is successfully created
    try {
      await api.deleteProfile(profileId)
    } catch (deleteError) {
      // If delete fails, that's okay - the new profile was created successfully
      console.warn('Could not delete old profile:', deleteError)
    }

    // Download the profile content
    const profileData = Buffer.from(newProfile.attributes.profileContent, 'base64')
    const meta = await parseMobileProvision(profileData)
    const platform = newProfile.attributes.profileType.startsWith('TVOS') ? 'TVOS' : 'IOS'

    // Save to local database
    const created = await prisma.provisioningProfile.create({
      data: {
        userId: user.id,
        platform,
        name: meta.name || newProfile.attributes.name,
        uuid: meta.uuid || newProfile.attributes.uuid,
        teamId: meta.teamId || null,
        expiresAt: meta.expiresAt || new Date(newProfile.attributes.expirationDate),
        data: profileData
      }
    })

    // If activateAfter is true, set this as the active profile
    if (activateAfter) {
      // Deactivate other profiles for this platform
      await prisma.provisioningProfile.updateMany({
        where: { userId: user.id, platform, active: true },
        data: { active: false }
      })
      // Activate the new one
      await prisma.provisioningProfile.update({
        where: { id: created.id },
        data: { active: true }
      })
    }

    return {
      success: true,
      newAppleProfileId: newProfile.id,
      devicesIncluded: enabledDeviceIds.length,
      profile: {
        id: created.id,
        name: created.name,
        platform: created.platform,
        uuid: created.uuid,
        teamId: created.teamId,
        expiresAt: created.expiresAt,
        active: activateAfter
      }
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to regenerate profile: ${e.message}`
    })
  }
})

// Helper to fetch profile with its bundle ID and certificate relationships
async function fetchProfileWithRelations(api: AppleDeveloperAPI, profileId: string): Promise<{
  bundleIdId: string
  certificateIds: string[]
}> {
  const token = api.generateToken()
  
  // Apple API requires separate calls to get relationships
  // First get the profile's bundle ID
  const bundleIdRes = await fetch(
    `https://api.appstoreconnect.apple.com/v1/profiles/${profileId}/bundleId`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!bundleIdRes.ok) {
    const errorText = await bundleIdRes.text()
    throw new Error(`Failed to fetch bundle ID: ${bundleIdRes.status} - ${errorText}`)
  }
  
  const bundleIdText = await bundleIdRes.text()
  if (!bundleIdText) {
    throw new Error('Empty response when fetching bundle ID')
  }
  
  let bundleIdData: any
  try {
    bundleIdData = JSON.parse(bundleIdText)
  } catch {
    throw new Error(`Invalid JSON response for bundle ID: ${bundleIdText.slice(0, 200)}`)
  }
  
  const bundleIdId = bundleIdData.data?.id

  if (!bundleIdId) {
    throw new Error(`Could not retrieve bundle ID for profile. Response: ${JSON.stringify(bundleIdData).slice(0, 200)}`)
  }

  // Get the profile's certificates
  const certsRes = await fetch(
    `https://api.appstoreconnect.apple.com/v1/profiles/${profileId}/certificates`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!certsRes.ok) {
    const errorText = await certsRes.text()
    throw new Error(`Failed to fetch certificates: ${certsRes.status} - ${errorText}`)
  }
  
  const certsText = await certsRes.text()
  if (!certsText) {
    throw new Error('Empty response when fetching certificates')
  }
  
  let certsData: any
  try {
    certsData = JSON.parse(certsText)
  } catch {
    throw new Error(`Invalid JSON response for certificates: ${certsText.slice(0, 200)}`)
  }
  
  const certificateIds = (certsData.data || []).map((c: any) => c.id)

  if (certificateIds.length === 0) {
    throw new Error(`Could not retrieve certificates for profile. Response: ${JSON.stringify(certsData).slice(0, 200)}`)
  }

  return { bundleIdId, certificateIds }
}

