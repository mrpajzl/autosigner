import { prisma } from './db'
import { storage, type StoredObjectInfo } from './storage'
import { planOrphanedUploadCleanup, type UploadCleanupDbState } from './storage-cleanup-plan'

const CLEANUP_BATCH_SIZE = 50

async function loadCleanupDbState(): Promise<UploadCleanupDbState> {
  const [users, apps, signedVersions] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.app.findMany({
      select: {
        id: true,
        ownerId: true,
        ipaFileName: true,
        originalIpaPath: true,
        signedIpaPath: true,
        manifestPath: true,
        iconPath: true
      }
    }),
    prisma.signedVersion.findMany({
      select: {
        id: true,
        signerId: true,
        signedIpaPath: true,
        manifestPath: true
      }
    })
  ])
  return { users, apps, signedVersions }
}

export async function cleanupOrphanedStoredUploads(): Promise<{ totalCleaned: number; errors: string[] }> {
  const errors: string[] = []
  let totalCleaned = 0

  try {
    const [objects, state] = await Promise.all([
      storage.listPrefix('/uploads') as Promise<StoredObjectInfo[]>,
      loadCleanupDbState()
    ])
    const plan = planOrphanedUploadCleanup(objects, state)

    for (const prefix of plan.deletePrefixes.slice(0, CLEANUP_BATCH_SIZE)) {
      try {
        await storage.deletePrefix(prefix)
        totalCleaned++
        console.log(`Cleaned up orphaned stored upload: ${prefix}`)
      } catch (e) {
        const msg = `Failed to remove orphaned stored upload ${prefix}: ${e}`
        errors.push(msg)
        console.warn(msg)
      }
    }
  } catch (e) {
    const msg = `Failed during stored upload cleanup: ${e}`
    errors.push(msg)
    console.error(msg)
  }

  if (totalCleaned > 0) {
    console.log(`Stored upload cleanup complete: removed ${totalCleaned} items`)
  }

  return { totalCleaned, errors }
}
