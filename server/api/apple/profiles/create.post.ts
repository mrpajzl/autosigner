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
  certificateIds: z.array(z.string()).min(1, 'At least one certificate is required'),
  deviceIds: z.array(z.string()).min(1, 'At least one device is required'),
  profileType: z.enum([
    'IOS_APP_DEVELOPMENT',
    'IOS_APP_ADHOC',
    'IOS_APP_STORE',
    'TVOS_APP_DEVELOPMENT',
    'TVOS_APP_ADHOC',
    'TVOS_APP_STORE'
  ])
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

  const { name, bundleIdId, certificateIds, deviceIds, profileType } = parsed.data

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
    // Create profile in Apple Developer Portal
    const appleProfile = await api.createProfile(name, bundleIdId, certificateIds, deviceIds, profileType)

    // Download the profile content
    const profileData = Buffer.from(appleProfile.attributes.profileContent, 'base64')
    
    // Parse metadata
    const meta = await parseMobileProvision(profileData)

    // Determine platform
    const platform = profileType.startsWith('TVOS') ? 'TVOS' : 'IOS'

    // Save to local database
    const created = await prisma.provisioningProfile.create({
      data: {
        userId: user.id,
        platform,
        name: meta.name || name,
        uuid: meta.uuid || appleProfile.attributes.uuid,
        teamId: meta.teamId || null,
        expiresAt: meta.expiresAt || new Date(appleProfile.attributes.expirationDate),
        data: profileData
      }
    })

    return {
      success: true,
      appleProfileId: appleProfile.id,
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
      message: `Failed to create profile: ${e.message}`
    })
  }
})


