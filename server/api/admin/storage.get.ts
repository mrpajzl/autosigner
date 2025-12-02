import path from 'node:path'
import fse from 'fs-extra'
import { requireRole } from '../../utils/auth'

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

async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0
  
  try {
    const entries = await fse.readdir(dirPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(entryPath)
      } else if (entry.isFile()) {
        const stat = await fse.stat(entryPath)
        totalSize += stat.size
      }
    }
  } catch (e) {
    // Ignore errors for inaccessible files
  }
  
  return totalSize
}

async function analyzeUploadsDirectory(): Promise<StorageStats> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  
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
  
  if (!await fse.pathExists(uploadsDir)) {
    return stats
  }
  
  try {
    const userDirs = await fse.readdir(uploadsDir, { withFileTypes: true })
    
    for (const userDir of userDirs) {
      if (!userDir.isDirectory()) continue
      
      stats.userCount++
      const userPath = path.join(uploadsDir, userDir.name)
      const entries = await fse.readdir(userPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const entryPath = path.join(userPath, entry.name)
        
        if (entry.isFile() && entry.name.endsWith('.ipa')) {
          // Original IPA file
          const fileStat = await fse.stat(entryPath)
          stats.breakdown.originalIpas.count++
          stats.breakdown.originalIpas.sizeBytes += fileStat.size
          stats.totalSizeBytes += fileStat.size
        } else if (entry.isDirectory()) {
          const dirSize = await getDirectorySize(entryPath)
          
          // Work directory (pattern: {filename}.ipa.{timestamp})
          if (entry.name.includes('.ipa.')) {
            stats.breakdown.workDirectories.count++
            stats.breakdown.workDirectories.sizeBytes += dirSize
          }
          // App directory (signed apps)
          else if (entry.name.startsWith('c')) {
            // CUIDs start with 'c'
            stats.breakdown.signedApps.count++
            stats.breakdown.signedApps.sizeBytes += dirSize
          } else {
            stats.breakdown.other.count++
            stats.breakdown.other.sizeBytes += dirSize
          }
          
          stats.totalSizeBytes += dirSize
        } else {
          const fileStat = await fse.stat(entryPath).catch(() => ({ size: 0 }))
          stats.breakdown.other.count++
          stats.breakdown.other.sizeBytes += fileStat.size
          stats.totalSizeBytes += fileStat.size
        }
      }
    }
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

