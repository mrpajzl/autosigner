import { prisma } from '../../../../utils/db'
import { requireAnyRole } from '../../../../utils/auth'
import { signingQueue } from '../../../../utils/signing-queue'

/**
 * POST /api/admin/apps/:id/sign
 * Signs an app using the current user's active certificate and provisioning profile
 * Creates or updates a SignedVersion record for this user
 */
export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const appId = getRouterParam(event, 'id')

  if (!appId) {
    throw createError({ statusCode: 400, message: 'Missing app id' })
  }

  // Check app exists
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }

  // Get or create SignedVersion for this user
  let signedVersion = await prisma.signedVersion.findUnique({
    where: {
      appId_signerId: {
        appId,
        signerId: user.id
      }
    }
  })

  if (signedVersion) {
    // Update existing - reset status
    signedVersion = await prisma.signedVersion.update({
      where: { id: signedVersion.id },
      data: {
        status: 'SIGNING',
        signedAt: null,
        signedIpaPath: null,
        manifestPath: null
      }
    })
  } else {
    // Create new
    signedVersion = await prisma.signedVersion.create({
      data: {
        appId,
        signerId: user.id,
        status: 'SIGNING'
      }
    })
  }

  // Add to signing queue instead of fire-and-forget
  await signingQueue.enqueue(appId, user.id, signedVersion.id)
  const queuePosition = signingQueue.getQueuePosition(signedVersion.id)

  return { 
    ok: true, 
    signedVersionId: signedVersion.id,
    queuePosition
  }
})



