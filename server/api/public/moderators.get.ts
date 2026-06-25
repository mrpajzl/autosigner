import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { getSessionUser } from '../../utils/auth'
import { logAppleDeveloperWarning } from '../../utils/apple-warning-logger'

type PublicApp = {
  id: string
  name: string
  version: string
  buildNumber?: string | null
  showBuildNumber: boolean
  loggedInOnly: boolean
  platform: 'IOS' | 'TVOS'
  uploadedAt: string
  manifestPath?: string | null
  downloadPath?: string | null
  status: string
  iconPath?: string | null
}

type DeviceCounts = {
  iOS: number      // iPhone + iPad
  APPLE_TV: number
  MAC: number
  total: number
}

type PublicModerator = {
  id: string
  name: string
  iosApps: PublicApp[]
  tvosApps: PublicApp[]
  profileUpdatedAt: string | null
  profileAvailable: boolean
  certificateExpiresAt: string | null
  deviceCounts: DeviceCounts | null
  certificates: Array<{ id: string; displayName: string | null; expiresAt: string | null }>
  profiles: Array<{ id: string; name: string | null; platform: 'IOS' | 'TVOS'; expiresAt: string | null }>
  hasManagerProfileCertificate: boolean
  hasManagerProfileIos: boolean
  hasManagerProfileTvos: boolean
}

// Helper function to fetch device counts for a user with Apple credentials
async function fetchDeviceCounts(
  credentials: { keyId: string; issuerId: string; privateKeyEnc: string; teamName?: string | null },
  context: { moderatorId: string }
): Promise<DeviceCounts | null> {
  try {
    const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()
    const api = new AppleDeveloperAPI({
      keyId: credentials.keyId,
      issuerId: credentials.issuerId,
      privateKey
    })
    
    const devices = await api.listDevices()
    
    // Count by device class (simplified categories)
    const counts: DeviceCounts = {
      iOS: 0,        // iPhone + iPad
      APPLE_TV: 0,
      MAC: 0,
      total: devices.length
    }
    
    for (const device of devices) {
      const deviceClass = device.attributes.deviceClass
      const platform = device.attributes.platform
      if (deviceClass === 'IPHONE' || deviceClass === 'IPAD') counts.iOS++
      else if (deviceClass === 'APPLE_TV') counts.APPLE_TV++
      else if (deviceClass === 'MAC' || platform === 'MAC_OS') counts.MAC++
      // Other device types (like APPLE_WATCH) are not counted separately
    }
    
    return counts
  } catch (e) {
    logAppleDeveloperWarning({
      scope: 'public-moderator-device-counts',
      error: e,
      moderatorId: context.moderatorId,
      accountLabel: credentials.teamName
    })
    return null
  }
}

export default defineEventHandler(async (event) => {
  try {
    const user = await getSessionUser(event)
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'SUPERADMIN'] },
        // Must have a certificate (either in managerProfile or active Certificate)
        OR: [
          { managerProfile: { certificatePem: { not: null } } },
          { certificates: { some: { active: true } } }
        ],
        // Must have at least one successfully signed app
        AND: {
          OR: [
            { signedVersions: { some: { status: 'SIGNED' } } },
            { apps: { some: { status: 'SIGNED' } } }
          ]
        }
      },
      include: {
        managerProfile: true,
        certificates: { where: { active: true }, take: 1, select: { id: true, displayName: true, expiresAt: true } },
        provisioningProfiles: { where: { active: true }, select: { id: true, name: true, platform: true, expiresAt: true } },
        appleDeveloperCredentials: true,
        // Get apps the moderator has signed (SignedVersion)
        signedVersions: {
          where: { status: 'SIGNED' },
          include: {
            app: true
          },
          orderBy: { signedAt: 'desc' }
        },
        // Also get apps they uploaded (for backwards compatibility)
        apps: {
          orderBy: { uploadedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Fetch device counts for all managers in parallel
    const deviceCountsPromises = managers.map(async (u) => {
      if (u.appleDeveloperCredentials) {
        return fetchDeviceCounts(u.appleDeveloperCredentials, { moderatorId: u.id })
      }
      return null
    })
    const allDeviceCounts = await Promise.all(deviceCountsPromises)

    const data: PublicModerator[] = managers.map((u, index) => {
      const certificateExpiresAt = (() => {
        const expiresAt = (u.certificates[0] as any)?.expiresAt as Date | string | null | undefined
        if (!expiresAt) return null
        const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
        return Number.isNaN(date.valueOf()) ? null : date.toISOString()
      })()

      const deviceCounts = allDeviceCounts[index]

      // Prefer signed versions (new system), fall back to uploaded apps (old system)
      const hasSignedVersions = u.signedVersions.length > 0
      
      if (hasSignedVersions) {
        // Use SignedVersion records - apps signed by this moderator
        // Group by app name to show multiple different apps
        const iosApps = u.signedVersions
          .filter((x) => x.app.platform === 'IOS' && (!x.app.loggedInOnly || !!user))
          .map(sv => ({
            id: sv.id, // Use SignedVersion ID for manifest lookup
            name: sv.app.name,
            version: sv.app.version,
            buildNumber: sv.app.buildNumber,
            showBuildNumber: sv.app.showBuildNumber,
            loggedInOnly: sv.app.loggedInOnly,
            platform: 'IOS' as const,
            uploadedAt: (sv.signedAt || sv.createdAt).toISOString(),
            manifestPath: sv.manifestPath,
            downloadPath: null,
            status: sv.status,
            iconPath: sv.app.iconPath
          }))

        const tvosApps = u.signedVersions
          .filter((x) => x.app.platform === 'TVOS' && (!x.app.loggedInOnly || !!user))
          .map(sv => ({
            id: sv.id,
            name: sv.app.name,
            version: sv.app.version,
            buildNumber: sv.app.buildNumber,
            showBuildNumber: sv.app.showBuildNumber,
            loggedInOnly: sv.app.loggedInOnly,
            platform: 'TVOS' as const,
            uploadedAt: (sv.signedAt || sv.createdAt).toISOString(),
            manifestPath: null,
            downloadPath: sv.signedIpaPath,
            status: sv.status,
            iconPath: sv.app.iconPath
          }))

        return {
          id: u.id,
          name: u.managerProfile?.displayName || u.nickname,
          iosApps,
          tvosApps,
          profileUpdatedAt: u.managerProfile ? u.managerProfile.createdAt.toISOString() : null,
          profileAvailable: Boolean(
            u.managerProfile?.certificatePem &&
            (u.managerProfile?.mobileprovisionIos || u.managerProfile?.mobileprovisionTvos)
          ),
          certificateExpiresAt,
          deviceCounts,
          certificates: u.certificates.map(c => ({
            id: c.id,
            displayName: c.displayName,
            expiresAt: c.expiresAt?.toISOString() || null
          })),
          profiles: u.provisioningProfiles.map(p => ({
            id: p.id,
            name: p.name,
            platform: p.platform as 'IOS' | 'TVOS',
            expiresAt: p.expiresAt?.toISOString() || null
          })),
          // Legacy support: also include managerProfile data if available
          hasManagerProfileCertificate: Boolean(u.managerProfile?.certificatePem),
          hasManagerProfileIos: Boolean(u.managerProfile?.mobileprovisionIos),
          hasManagerProfileTvos: Boolean(u.managerProfile?.mobileprovisionTvos)
        }
      } else {
        // Fallback to old system - apps uploaded by this moderator
        // Show all apps, differentiated by name
        const iosApps = u.apps
          .filter((x) => x.platform === 'IOS' && (!x.loggedInOnly || !!user))
          .map((a) => ({
            id: a.id,
            name: a.name,
            version: a.version,
            buildNumber: a.buildNumber,
            showBuildNumber: a.showBuildNumber,
            loggedInOnly: a.loggedInOnly,
            platform: 'IOS' as const,
            uploadedAt: a.uploadedAt.toISOString(),
            manifestPath: a.manifestPath,
            downloadPath: null,
            status: a.status,
            iconPath: a.iconPath
          }))
        
        const tvosApps = u.apps
          .filter((x) => x.platform === 'TVOS' && (!x.loggedInOnly || !!user))
          .map((a) => ({
            id: a.id,
            name: a.name,
            version: a.version,
            buildNumber: a.buildNumber,
            showBuildNumber: a.showBuildNumber,
            loggedInOnly: a.loggedInOnly,
            platform: 'TVOS' as const,
            uploadedAt: a.uploadedAt.toISOString(),
            manifestPath: null,
            downloadPath: a.signedIpaPath ?? a.originalIpaPath,
            status: a.status,
            iconPath: a.iconPath
          }))

        return {
          id: u.id,
          name: u.managerProfile?.displayName || u.nickname,
          iosApps,
          tvosApps,
          profileUpdatedAt: u.managerProfile ? u.managerProfile.createdAt.toISOString() : null,
          profileAvailable: Boolean(
            u.managerProfile?.certificatePem &&
            (u.managerProfile?.mobileprovisionIos || u.managerProfile?.mobileprovisionTvos)
          ),
          certificateExpiresAt,
          deviceCounts,
          certificates: u.certificates.map(c => ({
            id: c.id,
            displayName: c.displayName,
            expiresAt: c.expiresAt?.toISOString() || null
          })),
          profiles: u.provisioningProfiles.map(p => ({
            id: p.id,
            name: p.name,
            platform: p.platform as 'IOS' | 'TVOS',
            expiresAt: p.expiresAt?.toISOString() || null
          })),
          // Legacy support: also include managerProfile data if available
          hasManagerProfileCertificate: Boolean(u.managerProfile?.certificatePem),
          hasManagerProfileIos: Boolean(u.managerProfile?.mobileprovisionIos),
          hasManagerProfileTvos: Boolean(u.managerProfile?.mobileprovisionTvos)
        }
      }
    })

    return data
  } catch (e) {
    console.error('Failed to fetch public moderators', e)
    // Avoid failing public homepage if DB is not ready; return empty list
    return []
  }
})


