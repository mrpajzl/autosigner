import { prisma } from '../../../../../utils/db'
import { requireAnyRole } from '../../../../../utils/auth'
import { signingQueue } from '../../../../../utils/signing-queue'

/**
 * POST /api/admin/apps/:id/retry/:svId
 * Retries signing for a specific failed SignedVersion.
 * Only SUPERADMIN or the original signer can retry.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const appId = getRouterParam(event, 'id')
  const svId = getRouterParam(event, 'svId')

  if (!appId || !svId) {
    throw createError({ statusCode: 400, message: 'Missing app id or signed version id' })
  }

  // Check app exists
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }

  // Get the signed version
  const signedVersion = await prisma.signedVersion.findUnique({
    where: { id: svId },
    include: { signer: { select: { id: true, nickname: true } } }
  })

  if (!signedVersion) {
    throw createError({ statusCode: 404, message: 'Signed version not found' })
  }

  if (signedVersion.appId !== appId) {
    throw createError({ statusCode: 400, message: 'Signed version does not belong to this app' })
  }

  // Only allow retry if the current user is the signer or a SUPERADMIN
  if (signedVersion.signerId !== user.id && user.role !== 'SUPERADMIN') {
    throw createError({ statusCode: 403, message: 'You can only retry your own failed signings' })
  }

  // Only allow retry if the status is FAILED
  if (signedVersion.status !== 'FAILED') {
    throw createError({ statusCode: 400, message: 'Can only retry failed signings' })
  }

  // Reset the signed version status and queue for signing
  await prisma.signedVersion.update({
    where: { id: svId },
    data: {
      status: 'SIGNING',
      signedAt: null,
      signedIpaPath: null,
      manifestPath: null
    }
  })

  // Add to signing queue
  await signingQueue.enqueue(appId, signedVersion.signerId, svId)
  const queuePosition = signingQueue.getQueuePosition(svId)

  return { 
    ok: true, 
    signedVersionId: svId,
    signerName: signedVersion.signer.nickname,
    queuePosition
  }
})

