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
    where: { role: { in: ['MANAGER', 'ADMIN', 'SUPERADMIN'] } },
    include: {
      managerProfile: true,
      apps: {
        orderBy: { uploadedAt: 'desc' },
        take: 6 // show a few recent like on the screenshot
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  const data: PublicModerator[] = managers.map((u) => {
    const iosDedup = new Map<string, typeof u.apps[number]>()
    for (const a of u.apps.filter((x) => x.platform === 'IOS')) {
      const key = a.ipaFileName || `${a.bundleId}`
      if (!iosDedup.has(key)) iosDedup.set(key, a)
    }
    const iosApps = Array.from(iosDedup.values())
      .map((a) => ({
        id: a.id,
        name: a.name,
        version: a.version,
        platform: 'IOS',
        uploadedAt: a.uploadedAt.toISOString(),
        manifestPath: a.manifestPath,
        downloadPath: null,
        status: a.status
      }))
    const tvosDedup = new Map<string, typeof u.apps[number]>()
    for (const a of u.apps.filter((x) => x.platform === 'TVOS')) {
      const key = a.ipaFileName || `${a.bundleId}`
      if (!tvosDedup.has(key)) tvosDedup.set(key, a)
    }
    const tvosApps = Array.from(tvosDedup.values())
      .map((a) => ({
        id: a.id,
        name: a.name,
        version: a.version,
        platform: 'TVOS',
        uploadedAt: a.uploadedAt.toISOString(),
        manifestPath: null,
        downloadPath: a.signedIpaPath ?? a.originalIpaPath,
        status: a.status
      }))

    return {
      id: u.id,
      name: u.managerProfile?.displayName || u.email,
      iosApps,
      tvosApps,
      profileUpdatedAt: u.managerProfile ? u.managerProfile.createdAt.toISOString() : null,
      profileAvailable: Boolean(
        u.managerProfile?.certificatePem &&
        (u.managerProfile?.mobileprovisionIos || u.managerProfile?.mobileprovisionTvos)
      )
    }
  })

  return data
  } catch (e) {
    console.error('Failed to fetch public moderators', e)
    // Avoid failing public homepage if DB is not ready; return empty list
    return []
  }
})


