import path from 'node:path'
// @ts-ignore
import fse from 'fs-extra'
// @ts-ignore
import plist from 'plist'
import type { App as AppModel } from '@prisma/client'
import { prisma } from './db'
import { decrypt } from './crypto'
import { storage } from './storage'
import { cleanupOrphanedStoredUploads } from './storage-cleanup'
import { useRuntimeConfig } from '#imports'
import { signIpa } from '../../signing/engine'
import { signIpaOverSsh } from '../../signing/ssh-client'

// Cleanup configuration
const WORK_DIR_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour - stale work directories older than this will be cleaned
const CLEANUP_BATCH_SIZE = 50 // Maximum directories to clean in one batch
const WORK_ROOT = path.join(process.cwd(), '.workdirs')

function getPublicBaseUrl(): string {
  try {
    return (process.env.PUBLIC_BASE_URL || useRuntimeConfig().public.baseUrl || '').toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

async function createWorkDir(tag: string): Promise<string> {
  await fse.ensureDir(WORK_ROOT)
  const safeTag = tag.replace(/[^a-zA-Z0-9_.-]/g, '')
  return fse.mkdtemp(path.join(WORK_ROOT, `${safeTag || 'job'}-`))
}

interface SigningAssets {
  p12Path?: string
  p12Password?: string
  profilePath?: string
  certIdentity?: string
}

async function ensureManagerAssetsOnDisk(userId: string, platform: 'IOS' | 'TVOS', intoDir: string): Promise<SigningAssets> {
  const prof = await prisma.managerProfile.findUnique({ where: { userId } })
  const activeCert = await prisma.certificate.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } })
  const activeProfile = await prisma.provisioningProfile.findFirst({ where: { userId, platform, active: true }, orderBy: { createdAt: 'desc' } })

  await fse.ensureDir(intoDir)
  let p12Path: string | undefined
  let p12Password: string | undefined
  let profilePath: string | undefined

  // Get P12 certificate
  if (activeCert?.p12Data) {
    try {
      p12Path = path.join(intoDir, 'cert.p12')
      await fse.writeFile(p12Path, Buffer.from(activeCert.p12Data))
      if (activeCert.p12PasswordEnc) {
        p12Password = decrypt(JSON.parse(activeCert.p12PasswordEnc)).toString('utf8')
      }
    } catch (e) {
      console.error('Failed to write P12 certificate:', e)
    }
  }

  // Legacy password fallback
  if (!p12Password && prof?.p12PasswordEnc) {
    try {
      const payload = JSON.parse(prof.p12PasswordEnc)
      const buf = decrypt(payload)
      p12Password = buf.toString('utf8')
    } catch {}
  }

  // Get provisioning profile
  const mobileprov = activeProfile?.data || (platform === 'IOS' ? prof?.mobileprovisionIos : prof?.mobileprovisionTvos)
  if (mobileprov) {
    profilePath = path.join(intoDir, 'profile.mobileprovision')
    await fse.writeFile(profilePath, Buffer.from(mobileprov))
  }

  return { p12Path, p12Password, profilePath }
}

/**
 * Clean up stale work directories for a specific user's upload folder
 * Work directories match pattern: {ipaFileName}.{timestamp}
 */
/**
 * Clean up all stale work directories across all users
 * This can be called periodically or after signing operations
 */
export async function cleanupAllStaleWorkDirectories(): Promise<{ totalCleaned: number; errors: string[] }> {
  let totalCleaned = 0
  const errors: string[] = []
  
  if (!await fse.pathExists(WORK_ROOT)) {
    return { totalCleaned, errors }
  }
  
  try {
    const entries = await fse.readdir(WORK_ROOT, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dirPath = path.join(WORK_ROOT, entry.name)
      try {
        const stat = await fse.stat(dirPath)
        const ageMs = Date.now() - stat.mtimeMs
        if (ageMs > WORK_DIR_MAX_AGE_MS) {
          await fse.remove(dirPath)
          totalCleaned++
          console.log(`Removed stale work directory ${dirPath}`)
        }
      } catch (e) {
        const msg = `Failed to cleanup work dir ${dirPath}: ${e}`
        errors.push(msg)
        console.warn(msg)
      }
      if (totalCleaned >= CLEANUP_BATCH_SIZE) break
    }
  } catch (e) {
    const msg = `Failed to list work directory root: ${e}`
    errors.push(msg)
    console.error(msg)
  }
  
  if (totalCleaned > 0) {
    console.log(`Cleanup complete: removed ${totalCleaned} stale work directories`)
  }
  
  return { totalCleaned, errors }
}

/**
 * Clean up work directories for a specific IPA file
 * Call this after successful signing to remove all old work directories for that IPA
 */
/**
 * Clean up orphaned app directories (directories that exist on disk but not in the database)
 * This handles cases where database deletion succeeded but file cleanup failed
 * Also cleans up orphaned SignedVersion directories
 */
export async function cleanupOrphanedAppDirectories(): Promise<{ totalCleaned: number; errors: string[] }> {
  if (storage.driver !== 'local') {
    return { totalCleaned: 0, errors: [] }
  }
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  let totalCleaned = 0
  const errors: string[] = []

  if (!await fse.pathExists(uploadsDir)) {
    return { totalCleaned, errors }
  }

  try {
    // Get all users who have uploaded apps or signed versions
    const users = await prisma.user.findMany({
      select: { id: true }
    })
    const userIds = new Set(users.map(u => u.id))

    // Get all valid app IDs and signed version IDs
    const allApps = await prisma.app.findMany({
      select: { id: true, ownerId: true, ipaFileName: true }
    })
    const allSignedVersions = await prisma.signedVersion.findMany({
      select: { id: true, signerId: true }
    })

    // Build lookup maps
    const appIdsByOwner = new Map<string, Set<string>>()
    const ipaFileNamesByOwner = new Map<string, Set<string>>()
    for (const app of allApps) {
      if (!appIdsByOwner.has(app.ownerId)) {
        appIdsByOwner.set(app.ownerId, new Set())
        ipaFileNamesByOwner.set(app.ownerId, new Set())
      }
      appIdsByOwner.get(app.ownerId)!.add(app.id)
      if (app.ipaFileName) {
        ipaFileNamesByOwner.get(app.ownerId)!.add(app.ipaFileName)
      }
    }

    const signedVersionIdsBySigner = new Map<string, Set<string>>()
    for (const sv of allSignedVersions) {
      if (!signedVersionIdsBySigner.has(sv.signerId)) {
        signedVersionIdsBySigner.set(sv.signerId, new Set())
      }
      signedVersionIdsBySigner.get(sv.signerId)!.add(sv.id)
    }

    const userDirs = await fse.readdir(uploadsDir, { withFileTypes: true })

    for (const userDir of userDirs) {
      if (!userDir.isDirectory()) continue
      const userId = userDir.name

      // Skip if this is not a valid user ID (might be a user that was deleted)
      if (!userIds.has(userId)) {
        // User doesn't exist anymore, clean up their entire upload directory
        const userUploadDir = path.join(uploadsDir, userId)
        try {
          await fse.remove(userUploadDir)
          totalCleaned++
          console.log(`Cleaned up orphaned user directory: ${userUploadDir}`)
        } catch (e) {
          const msg = `Failed to remove orphaned user directory ${userUploadDir}: ${e}`
          errors.push(msg)
          console.warn(msg)
        }
        continue
      }

      const userUploadDir = path.join(uploadsDir, userId)
      const appIds = appIdsByOwner.get(userId) || new Set()
      const ipaFileNames = ipaFileNamesByOwner.get(userId) || new Set()
      const signedVersionIds = signedVersionIdsBySigner.get(userId) || new Set()

      const entries = await fse.readdir(userUploadDir, { withFileTypes: true })

      for (const entry of entries) {
        // Skip IPA files - these are original uploads
        if (entry.name.endsWith('.ipa') && !entry.isDirectory()) {
          // Check if this IPA file is still referenced by any app
          if (!ipaFileNames.has(entry.name)) {
            // Orphaned IPA file
            const ipaPath = path.join(userUploadDir, entry.name)
            try {
              await fse.remove(ipaPath)
              totalCleaned++
              console.log(`Cleaned up orphaned IPA file: ${ipaPath}`)
            } catch (e) {
              const msg = `Failed to remove orphaned IPA ${ipaPath}: ${e}`
              errors.push(msg)
            }
          }
          continue
        }

        // Skip work directories (handled separately via WORK_ROOT)
        if (entry.name.includes('.ipa.')) continue

        // Check if this directory matches an app ID or signed version ID
        if (entry.isDirectory()) {
          const isValidAppDir = appIds.has(entry.name)
          const isValidSignedVersionDir = signedVersionIds.has(entry.name)
          
          if (!isValidAppDir && !isValidSignedVersionDir) {
            // Orphaned directory (neither app nor signed version)
            const orphanDir = path.join(userUploadDir, entry.name)
            try {
              await fse.remove(orphanDir)
              totalCleaned++
              console.log(`Cleaned up orphaned directory: ${orphanDir}`)
            } catch (e) {
              const msg = `Failed to remove orphaned directory ${orphanDir}: ${e}`
              errors.push(msg)
            }
          }
        }
      }
    }
  } catch (e) {
    const msg = `Failed during orphaned cleanup: ${e}`
    errors.push(msg)
    console.error(msg)
  }

  if (totalCleaned > 0) {
    console.log(`Orphaned cleanup complete: removed ${totalCleaned} items`)
  }

  return { totalCleaned, errors }
}

/**
 * Run full cleanup: stale work directories + orphaned items
 */
export async function runFullCleanup(): Promise<{
  staleWorkDirs: { totalCleaned: number; errors: string[] }
  orphaned: { totalCleaned: number; errors: string[] }
  storedUploads: { totalCleaned: number; errors: string[] }
}> {
  const staleWorkDirs = await cleanupAllStaleWorkDirectories()
  const orphaned = await cleanupOrphanedAppDirectories()
  const storedUploads = await cleanupOrphanedStoredUploads()
  return { staleWorkDirs, orphaned, storedUploads }
}

export async function signApp(appId: string, signal = AbortSignal.timeout(20 * 60 * 1000)): Promise<void> {
  await signStoredApp(appId, undefined, undefined, signal)
}

export async function signAppForUser(appId: string, signerId: string, signedVersionId: string, signal = AbortSignal.timeout(20 * 60 * 1000)): Promise<void> {
  await signStoredApp(appId, signerId, signedVersionId, signal)
}

async function signStoredApp(appId: string, signerId: string | undefined, signedVersionId: string | undefined, signal: AbortSignal): Promise<void> {
  const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } })
  const source = await pickAvailableIpa(app)
  if (!source.filePath) throw new Error('Source IPA not found on server storage')
  let jobRoot: string | undefined
  try {
    jobRoot = await createWorkDir(signedVersionId || app.id)
    await fse.chmod(jobRoot, 0o700)
    const assets = await ensureManagerAssetsOnDisk(signerId || app.ownerId, app.platform === 'TVOS' ? 'TVOS' : 'IOS', jobRoot)
    if (!assets.p12Path || !assets.profilePath) throw new Error('Missing active signing certificate or provisioning profile')
    const input = {
      sourcePath: source.filePath, p12Path: assets.p12Path, p12Password: assets.p12Password || '',
      profilePath: assets.profilePath, bundleId: app.bundleId,
      outputPath: path.join(jobRoot, 'signed.ipa'), workDir: path.join(jobRoot, 'unpacked')
    }
    if (process.env.SIGNING_BACKEND === 'ssh') await signIpaOverSsh(input, signal)
    else await signIpa(input, signal)
    signal.throwIfAborted()
    if (signedVersionId && signerId) await finalizeSignedVersionArtifact(app, signerId, signedVersionId, input.outputPath)
    else await finalizeSignedArtifact(app, input.outputPath)
  } finally {
    if (jobRoot) await fse.remove(jobRoot).catch(() => {})
    await source.cleanup().catch(() => {})
  }
}

async function pickAvailableIpa(app: AppModel): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const noop = async () => {}
  const candidates: (string | null | undefined)[] = [app.signedIpaPath, app.originalIpaPath]
  for (const publicPath of candidates) {
    if (!publicPath) continue
    if (await storage.pathExists(publicPath)) {
      return storage.downloadToTempFile(publicPath, app.id)
    }
  }
  return { filePath: '', cleanup: noop }
}

async function finalizeSignedArtifact(app: AppModel, signedFilePath: string): Promise<void> {
  const fileName = `${app.id}-signed.ipa`
  const signedPublic = `/uploads/${app.ownerId}/${app.id}/${fileName}`
  await storage.saveFileFromPath(signedPublic, signedFilePath, 'application/octet-stream')

  let manifestPublic: string | undefined
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'
  
  // Generate manifest for OTA installation
  const baseUrl = getPublicBaseUrl()
  const platformIdentifier = platform === 'TVOS' ? 'com.apple.platform.appletvos' : 'com.apple.platform.iphoneos'
  const iconRel = (app.iconPath || '').replace(/^\//, '')
  const iconUrl = iconRel ? `${baseUrl}/${iconRel}` : undefined
  const downloadPath = `${baseUrl}/api/download/${signedPublic.replace(/^\//, '')}`
  const assets: any[] = [{ kind: 'software-package', url: downloadPath }]
  if (iconUrl) {
    assets.push({ kind: 'display-image', url: iconUrl })
  }
  assets.push({ kind: 'full-size-image', url: downloadPath })

  const manifest = {
    items: [
      {
        assets,
        metadata: {
          'bundle-identifier': app.bundleId,
          'bundle-version': app.version || '0.0.0',
          kind: 'software',
          'platform-identifier': platformIdentifier,
          title: app.name
        }
      }
    ]
  }
  const plistXml = plist.build(manifest as any)
  manifestPublic = `/uploads/${app.ownerId}/${app.id}/manifest.plist`
  await storage.saveBuffer(manifestPublic, plistXml, 'application/xml')

  await prisma.app.update({
    where: { id: app.id },
    data: {
      status: 'SIGNED',
      signedAt: new Date(),
      signedIpaPath: signedPublic,
      manifestPath: manifestPublic
    }
  })
}

export async function triggerResignForUser(userId: string, platform?: 'IOS' | 'TVOS'): Promise<void> {
  // Import signing queue lazily to avoid circular dependencies
  const { signingQueue } = await import('./signing-queue')
  
  // Re-sign apps the user has uploaded (owner signing)
  const ownerWhere: any = { ownerId: userId }
  if (platform) ownerWhere.platform = platform
  const ownerApps = await prisma.app.findMany({ where: ownerWhere, orderBy: { uploadedAt: 'desc' } })
  for (const a of ownerApps) {
    try {
      await prisma.app.update({ where: { id: a.id }, data: { status: 'SIGNING', signedAt: null } })
      await signingQueue.enqueueOwnerSigning(a.id, userId)
    } catch (e) {
      console.error(`Failed to queue re-signing for owned app ${a.id}:`, e)
    }
  }
  
  // Re-sign apps the user has signed as a moderator (SignedVersion signing)
  const signedVersionWhere: any = { signerId: userId }
  if (platform) {
    signedVersionWhere.app = { platform }
  }
  const signedVersions = await prisma.signedVersion.findMany({
    where: signedVersionWhere,
    include: { app: true },
    orderBy: { createdAt: 'desc' }
  })
  for (const sv of signedVersions) {
    // Only re-sign if the app's platform matches (if platform filter is specified)
    if (!platform || sv.app.platform === platform) {
      try {
        await prisma.signedVersion.update({
          where: { id: sv.id },
          data: { status: 'SIGNING', signedAt: null, signedIpaPath: null, manifestPath: null }
        })
        await signingQueue.enqueue(sv.appId, userId, sv.id)
      } catch (e) {
        console.error(`Failed to queue re-signing for SignedVersion ${sv.id}:`, e)
      }
    }
  }
}

/**
 * Finalize a signed version artifact - update manifest and database
 */
async function finalizeSignedVersionArtifact(
  app: AppModel,
  signerId: string,
  signedVersionId: string,
  signedFilePath: string
): Promise<void> {
  const fileName = `${signedVersionId}-signed.ipa`
  const signedPublic = `/uploads/${signerId}/${signedVersionId}/${fileName}`
  await storage.saveFileFromPath(signedPublic, signedFilePath, 'application/octet-stream')
  let manifestPublic: string | undefined
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'
  
  // Generate manifest for OTA installation
  const baseUrl = getPublicBaseUrl()
  const platformIdentifier = platform === 'TVOS' ? 'com.apple.platform.appletvos' : 'com.apple.platform.iphoneos'
  const iconRel = (app.iconPath || '').replace(/^\//, '')
  const iconUrl = iconRel ? `${baseUrl}/${iconRel}` : undefined
  const downloadPath = `${baseUrl}/api/download/${signedPublic.replace(/^\//, '')}`
  const assets: any[] = [{ kind: 'software-package', url: downloadPath }]
  if (iconUrl) {
    assets.push({ kind: 'display-image', url: iconUrl })
  }
  assets.push({ kind: 'full-size-image', url: downloadPath })

  const manifest = {
    items: [
      {
        assets,
        metadata: {
          'bundle-identifier': app.bundleId,
          'bundle-version': app.version || '0.0.0',
          kind: 'software',
          'platform-identifier': platformIdentifier,
          title: app.name
        }
      }
    ]
  }
  const plistXml = plist.build(manifest as any)
  manifestPublic = `/uploads/${signerId}/${signedVersionId}/manifest.plist`
  await storage.saveBuffer(manifestPublic, plistXml, 'application/xml')

  await prisma.signedVersion.update({
    where: { id: signedVersionId },
    data: {
      status: 'SIGNED',
      signedAt: new Date(),
      signedIpaPath: signedPublic,
      manifestPath: manifestPublic
    }
  })
}
