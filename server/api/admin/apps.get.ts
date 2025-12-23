import { prisma } from '../../utils/db'
import { requireAnyRole } from '../../utils/auth'

/**
 * GET /api/admin/apps
 * Returns all uploaded apps with their signed versions
 * Available to MANAGER and SUPERADMIN roles
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const apps = await prisma.app.findMany({
    orderBy: { uploadedAt: 'desc' },
    include: {
      owner: {
        select: { id: true, nickname: true }
      },
      signedVersions: {
        include: {
          signer: {
            select: { id: true, nickname: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return apps.map(app => ({
    id: app.id,
    name: app.name,
    bundleId: app.bundleId,
    version: app.version,
    buildNumber: app.buildNumber,
    showBuildNumber: app.showBuildNumber,
    loggedInOnly: app.loggedInOnly,
    platform: app.platform,
    ipaFileName: app.ipaFileName,
    originalIpaPath: app.originalIpaPath,
    iconPath: app.iconPath,
    uploadedAt: app.uploadedAt,
    owner: app.owner,
    signedVersions: app.signedVersions.map(sv => ({
      id: sv.id,
      signerId: sv.signerId,
      signerName: sv.signer.nickname,
      status: sv.status,
      signedAt: sv.signedAt,
      signedIpaPath: sv.signedIpaPath,
      manifestPath: sv.manifestPath
    }))
  }))
})



