import { requireRole } from '../../utils/auth'
import { storage } from '../../utils/storage'

interface StorageStats {
  totalSizeBytes: number
  totalSizeMB: number
  userCount: number
  breakdown: {
    signedApps: { count: number; sizeBytes: number }
    originalIpas: { count: number; sizeBytes: number }
    workDirectories: { count: number; sizeBytes: number }
    other: { count: number; sizeBytes: number }
  }
}

async function analyzeUploadsDirectory(): Promise<StorageStats> {
  const stats: StorageStats = {
    totalSizeBytes: 0,
    totalSizeMB: 0,
    userCount: 0,
    breakdown: {
      signedApps: { count: 0, sizeBytes: 0 },
      originalIpas: { count: 0, sizeBytes: 0 },
      workDirectories: { count: 0, sizeBytes: 0 },
      other: { count: 0, sizeBytes: 0 }
    }
  }
  
  try {
    const objects = await storage.listPrefix('/uploads')
    const userIds = new Set<string>()
    const signedMap = new Map<string, number>()
    const workMap = new Map<string, number>()

    const addSize = (current: number | undefined, size?: number) => (current || 0) + (size || 0)

    for (const obj of objects) {
      const rel = storage.normalizePublicPath(obj.key || '')
      if (!rel.startsWith('uploads/')) continue
      const rest = rel.slice('uploads/'.length)
      const [userId, ...segments] = rest.split('/').filter(Boolean)
      if (!userId) continue
      userIds.add(userId)
      const size = obj.size || 0
      stats.totalSizeBytes += size

      if (segments.length === 0) {
        stats.breakdown.other.count++
        stats.breakdown.other.sizeBytes += size
        continue
      }

      if (segments.length === 1) {
        const fileName = segments[0]
        if (fileName.endsWith('.ipa')) {
          stats.breakdown.originalIpas.count++
          stats.breakdown.originalIpas.sizeBytes += size
        } else {
          stats.breakdown.other.count++
          stats.breakdown.other.sizeBytes += size
        }
        continue
      }

      const dirName = segments[0]
      const objectKey = `${userId}/${dirName}`
      if (dirName.includes('.ipa.')) {
        workMap.set(objectKey, addSize(workMap.get(objectKey), size))
      } else if (dirName.startsWith('c')) {
        signedMap.set(objectKey, addSize(signedMap.get(objectKey), size))
      } else {
        stats.breakdown.other.count++
        stats.breakdown.other.sizeBytes += size
      }
    }

    stats.userCount = userIds.size
    stats.breakdown.signedApps.count = signedMap.size
    stats.breakdown.signedApps.sizeBytes = Array.from(signedMap.values()).reduce((acc, v) => acc + v, 0)
    stats.breakdown.workDirectories.count = workMap.size
    stats.breakdown.workDirectories.sizeBytes = Array.from(workMap.values()).reduce((acc, v) => acc + v, 0)
  } catch (e) {
    console.error('Error analyzing uploads directory:', e)
  }
  
  stats.totalSizeMB = Math.round(stats.totalSizeBytes / (1024 * 1024) * 100) / 100
  
  return stats
}

/**
 * Admin endpoint to get storage statistics
 * GET /api/admin/storage
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  
  const stats = await analyzeUploadsDirectory()
  
  return {
    success: true,
    stats,
    formatted: {
      total: `${stats.totalSizeMB} MB`,
      signedApps: `${Math.round(stats.breakdown.signedApps.sizeBytes / (1024 * 1024) * 100) / 100} MB (${stats.breakdown.signedApps.count} apps)`,
      originalIpas: `${Math.round(stats.breakdown.originalIpas.sizeBytes / (1024 * 1024) * 100) / 100} MB (${stats.breakdown.originalIpas.count} files)`,
      workDirectories: `${Math.round(stats.breakdown.workDirectories.sizeBytes / (1024 * 1024) * 100) / 100} MB (${stats.breakdown.workDirectories.count} dirs)`,
      other: `${Math.round(stats.breakdown.other.sizeBytes / (1024 * 1024) * 100) / 100} MB (${stats.breakdown.other.count} items)`
    }
  }
})



