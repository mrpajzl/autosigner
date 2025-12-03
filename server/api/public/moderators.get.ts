import { prisma } from '../../utils/db'

type PublicApp = {
  id: string
  name: string
  version: string
  platform: 'IOS' | 'TVOS'
  uploadedAt: string
  manifestPath?: string | null
  downloadPath?: string | null
  status: string
}

type PublicModerator = {
  id: string
  name: string
  iosApps: PublicApp[]
  tvosApps: PublicApp[]
  profileUpdatedAt: string | null
  profileAvailable: boolean
}

export default defineEventHandler(async () => {
  try {
    const managers = await prisma.user.findMany({
      where: { role: { in: ['MANAGER', 'SUPERADMIN'] } },
      include: {
        managerProfile: true,
        // Get apps the moderator has signed (SignedVersion)
        signedVersions: {
          where: { status: 'SIGNED' },
          include: {
            app: true
          },
          orderBy: { signedAt: 'desc' },
          take: 6
        },
        // Also get apps they uploaded (for backwards compatibility)
        apps: {
          orderBy: { uploadedAt: 'desc' },
          take: 6
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const data: PublicModerator[] = managers.map((u) => {
      // Prefer signed versions (new system), fall back to uploaded apps (old system)
      const hasSignedVersions = u.signedVersions.length > 0
      
      if (hasSignedVersions) {
        // Use SignedVersion records - apps signed by this moderator
        // Group by app name to show multiple different apps
        const iosApps = u.signedVersions
          .filter((x) => x.app.platform === 'IOS')
          .map(sv => ({
            id: sv.id, // Use SignedVersion ID for manifest lookup
            name: sv.app.name,
            version: sv.app.version,
            platform: 'IOS' as const,
            uploadedAt: (sv.signedAt || sv.createdAt).toISOString(),
            manifestPath: sv.manifestPath,
            downloadPath: null,
            status: sv.status
          }))

        const tvosApps = u.signedVersions
          .filter((x) => x.app.platform === 'TVOS')
          .map(sv => ({
            id: sv.id,
            name: sv.app.name,
            version: sv.app.version,
            platform: 'TVOS' as const,
            uploadedAt: (sv.signedAt || sv.createdAt).toISOString(),
            manifestPath: null,
            downloadPath: sv.signedIpaPath,
            status: sv.status
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
          )
        }
      } else {
        // Fallback to old system - apps uploaded by this moderator
        // Show all apps, differentiated by name
        const iosApps = u.apps
          .filter((x) => x.platform === 'IOS')
          .map((a) => ({
            id: a.id,
            name: a.name,
            version: a.version,
            platform: 'IOS' as const,
            uploadedAt: a.uploadedAt.toISOString(),
            manifestPath: a.manifestPath,
            downloadPath: null,
            status: a.status
          }))
        
        const tvosApps = u.apps
          .filter((x) => x.platform === 'TVOS')
          .map((a) => ({
            id: a.id,
            name: a.name,
            version: a.version,
            platform: 'TVOS' as const,
            uploadedAt: a.uploadedAt.toISOString(),
            manifestPath: null,
            downloadPath: a.signedIpaPath ?? a.originalIpaPath,
            status: a.status
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
          )
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


