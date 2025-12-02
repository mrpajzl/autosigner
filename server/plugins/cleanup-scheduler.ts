import { runFullCleanup } from '../utils/signer'

// Cleanup interval in milliseconds (default: 6 hours)
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '6') * 60 * 60 * 1000

let cleanupInterval: ReturnType<typeof setInterval> | null = null

export default defineNitroPlugin((nitro) => {
  // Skip scheduled cleanup if explicitly disabled
  if (process.env.DISABLE_AUTO_CLEANUP === 'true') {
    console.log('[Cleanup] Automatic cleanup is disabled')
    return
  }

  console.log(`[Cleanup] Starting scheduled cleanup (interval: ${CLEANUP_INTERVAL_MS / (60 * 60 * 1000)}h)`)

  // Run initial cleanup after a short delay to let the server start
  setTimeout(async () => {
    console.log('[Cleanup] Running initial cleanup...')
    try {
      const result = await runFullCleanup()
      const totalCleaned = result.staleWorkDirs.totalCleaned + result.orphaned.totalCleaned
      if (totalCleaned > 0) {
        console.log(`[Cleanup] Initial cleanup: removed ${result.staleWorkDirs.totalCleaned} stale work dirs, ${result.orphaned.totalCleaned} orphaned items`)
      }
    } catch (e) {
      console.error('[Cleanup] Initial cleanup failed:', e)
    }
  }, 30 * 1000) // 30 seconds after startup

  // Schedule periodic cleanup
  cleanupInterval = setInterval(async () => {
    console.log('[Cleanup] Running scheduled cleanup...')
    try {
      const result = await runFullCleanup()
      const totalCleaned = result.staleWorkDirs.totalCleaned + result.orphaned.totalCleaned
      if (totalCleaned > 0) {
        console.log(`[Cleanup] Scheduled cleanup: removed ${result.staleWorkDirs.totalCleaned} stale work dirs, ${result.orphaned.totalCleaned} orphaned items`)
      }
    } catch (e) {
      console.error('[Cleanup] Scheduled cleanup failed:', e)
    }
  }, CLEANUP_INTERVAL_MS)

  // Cleanup on server shutdown
  nitro.hooks.hook('close', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
      console.log('[Cleanup] Cleanup scheduler stopped')
    }
  })
})

