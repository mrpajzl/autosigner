import { requireAnyRole } from '../../utils/auth'
import { signingQueue } from '../../utils/signing-queue'

/**
 * GET /api/admin/queue-status
 * Returns the current status of the signing queue
 */
export default defineEventHandler(async (event) => {
  await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  
  const status = signingQueue.getStatus()
  
  return {
    queueLength: status.queueLength,
    runningCount: status.runningCount,
    maxConcurrent: status.maxConcurrent,
    pending: status.jobs.pending.map(j => ({
      signedVersionId: j.signedVersionId,
      appId: j.appId,
      signerId: j.signerId,
      createdAt: j.createdAt
    })),
    running: status.jobs.running.map(j => ({
      signedVersionId: j.signedVersionId,
      appId: j.appId,
      signerId: j.signerId,
      startedAt: j.startedAt
    }))
  }
})


