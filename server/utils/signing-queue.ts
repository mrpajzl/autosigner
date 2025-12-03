/**
 * Signing Job Queue
 * Limits concurrent signing operations to prevent system overload
 */

import { prisma } from './db'
import { signAppForUser, signApp } from './signer'

type JobType = 'owner' | 'user'

interface SigningJob {
  id: string
  appId: string
  signerId: string
  signedVersionId: string | null // null for owner signing
  jobType: JobType
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

// Configuration
const MAX_CONCURRENT_JOBS = 2 // Limit concurrent signing operations
const JOB_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes timeout per job

class SigningQueue {
  private queue: SigningJob[] = []
  private running: Map<string, SigningJob> = new Map()
  private processing = false

  /**
   * Add a signing job for a specific user (creates SignedVersion)
   */
  async enqueue(appId: string, signerId: string, signedVersionId: string): Promise<SigningJob> {
    const job: SigningJob = {
      id: `${signedVersionId}-${Date.now()}`,
      appId,
      signerId,
      signedVersionId,
      jobType: 'user',
      status: 'pending',
      createdAt: new Date()
    }

    this.queue.push(job)
    console.log(`[SigningQueue] Enqueued user job ${job.id} for app ${appId}, signer ${signerId}`)
    
    // Start processing if not already running
    this.processQueue()
    
    return job
  }

  /**
   * Add a signing job for the app owner (updates App model directly)
   */
  async enqueueOwnerSigning(appId: string, ownerId: string): Promise<SigningJob> {
    const job: SigningJob = {
      id: `owner-${appId}-${Date.now()}`,
      appId,
      signerId: ownerId,
      signedVersionId: null,
      jobType: 'owner',
      status: 'pending',
      createdAt: new Date()
    }

    this.queue.push(job)
    console.log(`[SigningQueue] Enqueued owner job ${job.id} for app ${appId}`)
    
    // Start processing if not already running
    this.processQueue()
    
    return job
  }

  /**
   * Process the queue - runs asynchronously
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true

    try {
      while (this.queue.length > 0 && this.running.size < MAX_CONCURRENT_JOBS) {
        const job = this.queue.shift()
        if (!job) break

        // Start the job
        job.status = 'running'
        job.startedAt = new Date()
        this.running.set(job.id, job)

        // Run the signing job without awaiting (fire-and-forget with tracking)
        this.runJob(job).catch((error) => {
          console.error(`[SigningQueue] Job ${job.id} failed with unhandled error:`, error)
        })
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * Run a single signing job
   */
  private async runJob(job: SigningJob): Promise<void> {
    console.log(`[SigningQueue] Starting ${job.jobType} job ${job.id}`)
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      console.error(`[SigningQueue] Job ${job.id} timed out after ${JOB_TIMEOUT_MS}ms`)
      this.completeJob(job, 'failed', 'Job timed out')
    }, JOB_TIMEOUT_MS)

    try {
      if (job.jobType === 'owner') {
        // Sign using App model (owner signing)
        await signApp(job.appId)
      } else {
        // Sign using SignedVersion model (user signing)
        await signAppForUser(job.appId, job.signerId, job.signedVersionId!)
      }
      clearTimeout(timeoutId)
      this.completeJob(job, 'completed')
    } catch (error: any) {
      clearTimeout(timeoutId)
      const errorMessage = error?.message || String(error)
      console.error(`[SigningQueue] Job ${job.id} failed:`, errorMessage)
      
      // Update status to FAILED
      if (job.jobType === 'owner') {
        await prisma.app.update({
          where: { id: job.appId },
          data: { status: 'FAILED' }
        }).catch((dbError) => {
          console.error(`[SigningQueue] Failed to update App status:`, dbError)
        })
      } else {
        await prisma.signedVersion.update({
          where: { id: job.signedVersionId! },
          data: { status: 'FAILED' }
        }).catch((dbError) => {
          console.error(`[SigningQueue] Failed to update SignedVersion status:`, dbError)
        })
      }
      
      this.completeJob(job, 'failed', errorMessage)
    }
  }

  /**
   * Mark a job as completed and continue processing
   */
  private completeJob(job: SigningJob, status: 'completed' | 'failed', error?: string): void {
    job.status = status
    job.completedAt = new Date()
    job.error = error
    this.running.delete(job.id)
    
    const duration = job.completedAt.getTime() - (job.startedAt?.getTime() || job.createdAt.getTime())
    console.log(`[SigningQueue] Job ${job.id} ${status} in ${duration}ms`)
    
    // Continue processing remaining jobs
    setImmediate(() => this.processQueue())
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number
    runningCount: number
    maxConcurrent: number
    jobs: {
      pending: SigningJob[]
      running: SigningJob[]
    }
  } {
    return {
      queueLength: this.queue.length,
      runningCount: this.running.size,
      maxConcurrent: MAX_CONCURRENT_JOBS,
      jobs: {
        pending: [...this.queue],
        running: [...this.running.values()]
      }
    }
  }

  /**
   * Check if a specific signed version is being processed
   */
  isProcessing(signedVersionId: string): boolean {
    const inQueue = this.queue.some(j => j.signedVersionId === signedVersionId)
    const isRunning = [...this.running.values()].some(j => j.signedVersionId === signedVersionId)
    return inQueue || isRunning
  }

  /**
   * Get position in queue for a specific signed version
   */
  getQueuePosition(signedVersionId: string): number | null {
    // Check if it's running
    if ([...this.running.values()].some(j => j.signedVersionId === signedVersionId)) {
      return 0 // Currently running
    }
    
    // Check position in queue
    const index = this.queue.findIndex(j => j.signedVersionId === signedVersionId)
    if (index === -1) return null
    
    return index + 1 + this.running.size // Position accounting for running jobs
  }
}

// Singleton instance
export const signingQueue = new SigningQueue()

