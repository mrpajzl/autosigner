import { open, stat } from 'node:fs/promises'
import { prisma } from '../utils/db'
import { signingQueue } from '../utils/signing-queue'
import { storage } from '../utils/storage'

type HealthStatus = 'ok' | 'warn' | 'error'

type ComponentHealth = {
  status: HealthStatus
  message?: string
  [key: string]: unknown
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('warn')) return 'warn'
  return 'ok'
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Unknown error'
}

function runtimeEnv(name: string): string | null {
  const maybeProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
  return maybeProcess?.env?.[name] || null
}

function runtimeCwd(): string {
  const maybeProcess = (globalThis as unknown as { process?: { cwd?: () => string } }).process
  return maybeProcess?.cwd?.() || '.'
}

async function readLogTail(relativePath: string, maxBytes = 256 * 1024): Promise<string | null> {
  const filePath = `${runtimeCwd().replace(/\/$/, '')}/${relativePath.replace(/^\//, '')}`
  try {
    const fileStats = await stat(filePath)
    const start = Math.max(0, fileStats.size - maxBytes)
    const length = fileStats.size - start
    if (length <= 0) return ''

    const handle = await open(filePath, 'r')
    try {
      const buffer = new Uint8Array(length)
      await handle.read(buffer, 0, length, start)
      return new TextDecoder().decode(buffer)
    } finally {
      await handle.close()
    }
  } catch {
    return null
  }
}

export default defineEventHandler(async () => {
  const checkedAt = new Date().toISOString()

  // Run independent dependency checks concurrently. When an external dependency
  // is unreachable, serial checks can exceed the watchdog's HTTP timeout and hide
  // the useful degraded-health JSON behind a transport timeout.
  const dbCheck = (async (): Promise<ComponentHealth> => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ok', message: 'Database query succeeded' }
    } catch (error) {
      return { status: 'error', message: safeErrorMessage(error) }
    }
  })()

  const storageHealthCheck = (async (): Promise<ComponentHealth> => {
    try {
      // Lightweight connectivity check. The prefix is intentionally not used by the app,
      // so this should avoid scanning large upload trees while still exercising the driver.
      await storage.listPrefix('/__healthcheck__')
      return { status: 'ok', driver: storage.driver, message: 'Storage driver is reachable' }
    } catch (error) {
      return { status: 'error', driver: storage.driver, message: safeErrorMessage(error) }
    }
  })()

  const queueStatus = signingQueue.getStatus()
  const queue: ComponentHealth = {
    status: queueStatus.runningCount >= queueStatus.maxConcurrent || queueStatus.queueLength > 0 ? 'warn' : 'ok',
    queueLength: queueStatus.queueLength,
    runningCount: queueStatus.runningCount,
    maxConcurrent: queueStatus.maxConcurrent,
    message: queueStatus.queueLength > 0
      ? 'Signing jobs are waiting in the queue'
      : queueStatus.runningCount > 0
        ? 'Signing jobs are currently running'
        : 'Signing queue is idle'
  }

  const appleCheck = (async (): Promise<ComponentHealth> => {
    try {
      const [configuredTeams, activeManagers] = await Promise.all([
        prisma.appleDeveloperCredentials.count(),
        prisma.user.count({
          where: {
            role: { in: ['MANAGER', 'SUPERADMIN'] },
            OR: [
              { managerProfile: { certificatePem: { not: null } } },
              { certificates: { some: { active: true } } }
            ],
            AND: {
              OR: [
                { signedVersions: { some: { status: 'SIGNED' } } },
                { apps: { some: { status: 'SIGNED' } } }
              ]
            }
          }
        })
      ])

      const recentLog = await readLogTail('logs/app.log')
      const hasRecentAgreementError = /agreement missing or expired|required agreement is missing or has expired|in-effect agreement that has not been signed or has expired|REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED/i.test(recentLog || '')

      if (configuredTeams === 0) {
        return {
          status: 'warn',
          configuredTeams,
          activeManagers,
          message: 'No Apple Developer API credentials are configured'
        }
      }

      if (hasRecentAgreementError) {
        return {
          status: 'warn',
          configuredTeams,
          activeManagers,
          agreementIssueDetected: true,
          message: 'Recent logs contain Apple Developer agreement missing/expired errors; Account Holder action is required'
        }
      }

      return {
        status: 'ok',
        configuredTeams,
        activeManagers,
        agreementIssueDetected: false,
        message: 'Apple Developer credentials are configured and no recent agreement errors were found in the app log'
      }
    } catch (error) {
      return { status: 'warn', message: safeErrorMessage(error) }
    }
  })()

  const [db, storageHealth, apple] = await Promise.all([
    dbCheck,
    storageHealthCheck,
    appleCheck
  ])

  const components = {
    db,
    storage: storageHealth,
    queue,
    apple
  }

  const status = worstStatus(Object.values(components).map((component) => component.status))

  return {
    status,
    checkedAt,
    service: 'fastsigner',
    version: runtimeEnv('VERCEL_GIT_COMMIT_SHA') || runtimeEnv('GIT_COMMIT'),
    components
  }
})
