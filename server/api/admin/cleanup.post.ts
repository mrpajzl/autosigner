import { requireRole } from '../../utils/auth'
import { cleanupAllStaleWorkDirectories, cleanupOrphanedAppDirectories, runFullCleanup } from '../../utils/signer'
import { cleanupOrphanedStoredUploads } from '../../utils/storage-cleanup'

/**
 * Admin endpoint to manually trigger cleanup
 * POST /api/admin/cleanup
 * 
 * Query params:
 * - mode: 'stale' (default) | 'orphaned' | 'stored' | 'full'
 *   - stale: Clean up stale work directories from signing operations
 *   - orphaned: Clean up local directories that don't have matching database entries
 *   - stored: Clean up orphaned upload objects from configured storage (local or MinIO/S3)
 *   - full: Run all cleanup tasks
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'SUPERADMIN')
  
  const query = getQuery(event)
  const mode = (query.mode as string) || 'full'
  
  console.log(`Manual cleanup triggered by admin (mode: ${mode})`)
  
  let totalCleaned = 0
  const allErrors: string[] = []
  const details: Record<string, any> = {}
  
  switch (mode) {
    case 'stale': {
      const result = await cleanupAllStaleWorkDirectories()
      totalCleaned = result.totalCleaned
      allErrors.push(...result.errors)
      details.staleWorkDirs = result
      break
    }
    case 'orphaned': {
      const result = await cleanupOrphanedAppDirectories()
      totalCleaned = result.totalCleaned
      allErrors.push(...result.errors)
      details.orphaned = result
      break
    }
    case 'stored': {
      const result = await cleanupOrphanedStoredUploads()
      totalCleaned = result.totalCleaned
      allErrors.push(...result.errors)
      details.storedUploads = result
      break
    }
    case 'full':
    default: {
      const result = await runFullCleanup()
      totalCleaned = result.staleWorkDirs.totalCleaned + result.orphaned.totalCleaned + result.storedUploads.totalCleaned
      allErrors.push(...result.staleWorkDirs.errors, ...result.orphaned.errors, ...result.storedUploads.errors)
      details.staleWorkDirs = result.staleWorkDirs
      details.orphaned = result.orphaned
      details.storedUploads = result.storedUploads
      break
    }
  }
  
  return {
    success: true,
    mode,
    cleaned: totalCleaned,
    errors: allErrors,
    details,
    message: totalCleaned > 0 
      ? `Cleaned up ${totalCleaned} items`
      : 'No items to clean'
  }
})

