import { prisma } from '../../../../utils/db'
import { requireAnyRole } from '../../../../utils/auth'
import { signAppForUser } from '../../../../utils/signer'

/**
 * POST /api/admin/apps/:id/sign-all
 * Signs an app for all moderators who have active certificates and provisioning profiles.
 * Creates SignedVersion records for each eligible moderator.
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const appId = getRouterParam(event, 'id')

  if (!appId) {
    throw createError({ statusCode: 400, message: 'Missing app id' })
  }

  // Check app exists
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }

  // Find all moderators with active credentials for this platform
  const moderators = await prisma.user.findMany({
    where: {
      role: { in: ['MANAGER', 'SUPERADMIN'] },
      status: 'APPROVED',
      // Must have an active certificate
      certificates: { some: { active: true } },
      // Must have an active provisioning profile for this platform
      provisioningProfiles: { some: { active: true, platform: app.platform } }
    },
    select: { id: true, nickname: true }
  })

  if (moderators.length === 0) {
    throw createError({ 
      statusCode: 400, 
      message: 'No moderators with valid certificates and profiles found' 
    })
  }

  const signedVersionIds: string[] = []
  const errors: string[] = []

  // Create or reset SignedVersion for each moderator
  for (const moderator of moderators) {
    try {
      let signedVersion = await prisma.signedVersion.findUnique({
        where: {
          appId_signerId: {
            appId,
            signerId: moderator.id
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
            signerId: moderator.id,
            status: 'SIGNING'
          }
        })
      }

      signedVersionIds.push(signedVersion.id)

      // Fire-and-forget signing in background
      ;(async () => {
        try {
          await signAppForUser(appId, moderator.id, signedVersion.id)
        } catch (e) {
          await prisma.signedVersion.update({
            where: { id: signedVersion.id },
            data: { status: 'FAILED' }
          })
          console.error('Signing failed for moderator', moderator.id, 'app', appId, e)
        }
      })()
    } catch (e: any) {
      errors.push(`Failed to queue signing for ${moderator.nickname}: ${e.message}`)
    }
  }

  return { 
    ok: true, 
    queued: signedVersionIds.length,
    moderators: moderators.map(m => m.nickname),
    errors: errors.length > 0 ? errors : undefined
  }
})

