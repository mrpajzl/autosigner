import { prisma } from '../../../../utils/db'
import { execa } from 'execa'
import plist from 'plist'
import { z } from 'zod'

const schema = z.object({
  udid: z.string().min(1, 'UDID je povinný').trim(),
  platform: z.enum(['IOS', 'TVOS']).default('IOS')
})

async function getProvisionedDevicesFromProfile(buf: Buffer): Promise<string[]> {
  try {
    // mobileprovision is a CMS (pkcs7) wrapper around a plist; use openssl to extract
    const { stdout } = await execa('bash', ['-lc', 'openssl smime -inform der -verify -noverify -in /dev/stdin -out /dev/stdout'], { input: buf })
    const obj = plist.parse(stdout) as any
    const devices = obj?.ProvisionedDevices as string[] | undefined
    return devices || []
  } catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  // Public endpoint - no authentication required
  const moderatorId = getRouterParam(event, 'id')

  if (!moderatorId) {
    throw createError({ statusCode: 400, message: 'ID moderátora je povinné' })
  }

  const body = await readBody(event)
  const validation = schema.safeParse(body)
  
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: validation.error.errors[0].message
    })
  }

  const { udid, platform } = validation.data

  // Find the moderator's active provisioning profile for the specified platform
  const profile = await prisma.provisioningProfile.findFirst({
    where: {
      userId: moderatorId,
      platform: platform,
      active: true
    }
  })

  if (!profile) {
    throw createError({
      statusCode: 404,
      message: `Aktivní ${platform === 'IOS' ? 'iOS' : 'tvOS'} profil nebyl nalezen`
    })
  }

  // Extract provisioned devices from the profile
  const provisionedDevices = await getProvisionedDevicesFromProfile(profile.data)

  // Check if the UDID is in the list (case-insensitive comparison)
  const normalizedUdid = udid.toLowerCase().replace(/[^a-f0-9]/g, '')
  const isFound = provisionedDevices.some(
    deviceUdid => deviceUdid.toLowerCase().replace(/[^a-f0-9]/g, '') === normalizedUdid
  )

  return {
    found: isFound,
    totalDevices: provisionedDevices.length,
    profileName: profile.name,
    profileUuid: profile.uuid,
    platform: profile.platform
  }
})

