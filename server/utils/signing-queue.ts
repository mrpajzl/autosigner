import { randomUUID } from 'node:crypto'
import { prisma } from './db'
import { signAppForUser, signApp } from './signer'
import { SignerUnavailableError } from '../../signing/ssh-client'

interface SigningJob {
  id: string
  appId: string
  signerId: string
  signedVersionId: string | null
  jobType: 'owner' | 'user'
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  startedAt: Date | null
  attempts: number
  leaseToken: string | null
}

class SigningQueue {
  private timer?: ReturnType<typeof setInterval>
  private active?: Promise<void>
  private stopped = false

  start() {
    if (this.timer || process.env.SIGNING_QUEUE_ENABLED === 'false') return
    this.stopped = false
    this.timer = setInterval(() => this.kick(), 15000)
    this.timer.unref()
    this.kick()
  }

  async stop() {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    // Let an active signing finish; container shutdown grace must exceed the job deadline.
    await this.active
  }

  private kick() {
    if (this.stopped || this.active || process.env.SIGNING_QUEUE_ENABLED === 'false') return
    this.active = this.processNext().catch(() => {
      console.error('[SigningQueue] Could not process queue; retrying on next tick')
    }).finally(() => { this.active = undefined })
  }

  enqueue(appId: string, signerId: string, signedVersionId: string) {
    return this.add(appId, signerId, signedVersionId)
  }

  enqueueOwnerSigning(appId: string, ownerId: string) {
    return this.add(appId, ownerId, null)
  }

  private async add(appId: string, signerId: string, signedVersionId: string | null) {
    const target = signedVersionId ? `user:${signedVersionId}` : `owner:${appId}`
    const type = signedVersionId ? 'user' : 'owner'
    const job = await prisma.$transaction(async tx => {
      await tx.$executeRaw`INSERT INTO "RemoteSigningJob" ("id", "targetKey", "appId", "signerId", "signedVersionId", "jobType")
        VALUES (${randomUUID()}, ${target}, ${appId}, ${signerId}, ${signedVersionId}, ${type}) ON CONFLICT DO NOTHING`
      const [job] = await tx.$queryRaw<SigningJob[]>`SELECT * FROM "RemoteSigningJob" WHERE "targetKey" = ${target} AND "status" IN ('pending','running')`
      if (!job) throw new Error('Unable to enqueue signing job')
      return job
    })
    this.kick()
    return job
  }

  private async processNext() {
    const token = randomUUID()
    const job = await prisma.$transaction(async tx => {
      // Serialize claims across overlapping deployments. Held only for this short transaction.
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(76321894) AS locked`
      if (!lock?.locked) return null
      // Lease exceeds the hard 25-minute attempt deadline, so abandoned work cannot publish late.
      await tx.$executeRaw`UPDATE "RemoteSigningJob" SET "status"='pending', "leaseToken"=NULL, "leaseUntil"=NULL WHERE "status"='running' AND "leaseUntil" < now()`
      const [next] = await tx.$queryRaw<SigningJob[]>`UPDATE "RemoteSigningJob" SET "status"='running', "startedAt"=now(), "leaseUntil"=now()+interval '30 minutes', "leaseToken"=${token}, "attempts"="attempts"+1
        WHERE "id"=(SELECT "id" FROM "RemoteSigningJob" WHERE "status"='pending' AND "availableAt" <= now()
        AND NOT EXISTS (SELECT 1 FROM "RemoteSigningJob" WHERE "status"='running') ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`
      return next || null
    })
    if (!job) return
    const signal = AbortSignal.timeout(25 * 60 * 1000)
    try {
      if (job.jobType === 'owner') await signApp(job.appId, signal)
      else await signAppForUser(job.appId, job.signerId, job.signedVersionId!, signal)
      await prisma.$executeRaw`UPDATE "RemoteSigningJob" SET "status"='completed', "completedAt"=now(), "leaseUntil"=NULL, "error"=NULL WHERE "id"=${job.id} AND "leaseToken"=${token}`
    } catch (error) {
      if (error instanceof SignerUnavailableError) {
        await prisma.$executeRaw`UPDATE "RemoteSigningJob" SET "status"='pending', "availableAt"=now()+interval '60 seconds', "leaseUntil"=NULL, "leaseToken"=NULL, "error"='Mac signer unavailable' WHERE "id"=${job.id} AND "leaseToken"=${token}`
      } else {
        // Store only a controlled message; signing credentials must never reach job logs.
        await prisma.$transaction(async tx => {
          const updated = await tx.$executeRaw`UPDATE "RemoteSigningJob" SET "status"='failed', "completedAt"=now(), "leaseUntil"=NULL, "error"='Signing failed; retry from application' WHERE "id"=${job.id} AND "leaseToken"=${token}`
          if (updated) {
            if (job.signedVersionId) await tx.signedVersion.updateMany({ where: { id: job.signedVersionId }, data: { status: 'FAILED' } })
            else await tx.app.updateMany({ where: { id: job.appId }, data: { status: 'FAILED' } })
          }
        })
      }
    }
  }

  async getStatus() {
    const jobs = await prisma.$queryRaw<SigningJob[]>`SELECT * FROM "RemoteSigningJob" WHERE "status" IN ('pending','running') ORDER BY "createdAt"`
    const pending = jobs.filter(j => j.status === 'pending')
    const running = jobs.filter(j => j.status === 'running')
    return { queueLength: pending.length, runningCount: running.length, maxConcurrent: 1, jobs: { pending, running } }
  }

  async isProcessing(signedVersionId: string) {
    return (await this.getQueuePosition(signedVersionId)) !== null
  }

  async getQueuePosition(signedVersionId: string) {
    const { jobs } = await this.getStatus()
    if (jobs.running.some(j => j.signedVersionId === signedVersionId)) return 0
    const index = jobs.pending.findIndex(j => j.signedVersionId === signedVersionId)
    return index < 0 ? null : index + 1 + jobs.running.length
  }
}

export const signingQueue = new SigningQueue()
