import path from 'node:path'
import { randomUUID } from 'node:crypto'
// @ts-ignore
import fse from 'fs-extra'
import { execa } from 'execa'
// @ts-ignore
import plist from 'plist'
// @ts-ignore
import bplist from 'bplist-parser'
import type { App as AppModel } from '@prisma/client'
import { prisma } from './db'
import { decrypt } from './crypto'
import { storage } from './storage'
import { useRuntimeConfig } from '#imports'

// Cleanup configuration
const WORK_DIR_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour - stale work directories older than this will be cleaned
const CLEANUP_BATCH_SIZE = 50 // Maximum directories to clean in one batch
const WORK_ROOT = path.join(process.cwd(), '.workdirs')

function getPublicBaseUrl(): string {
  try {
    return (useRuntimeConfig().public.baseUrl || '').toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

async function createWorkDir(tag: string): Promise<string> {
  await fse.ensureDir(WORK_ROOT)
  const safeTag = tag.replace(/[^a-zA-Z0-9_.-]/g, '')
  return fse.mkdtemp(path.join(WORK_ROOT, `${safeTag || 'job'}-`))
}

function parsePlistBuffer(buf: Buffer): any {
  const head = buf.subarray(0, 8).toString('utf8')
  if (head.startsWith('bplist')) {
    try {
      const arr = (bplist as any).parseBuffer(buf)
      return Array.isArray(arr) ? arr[0] : arr
    } catch {
      return undefined
    }
  }
  // Extract XML segment defensively
  let xml = buf.toString('utf8')
  const start = xml.indexOf('<?xml')
  const end = xml.lastIndexOf('</plist>')
  if (start >= 0 && end >= 0) {
    xml = xml.slice(start, end + '</plist>'.length)
  }
  try {
    return plist.parse(xml)
  } catch {
    return undefined
  }
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
 * Download and cache Apple WWDR intermediate certificates and Root CA
 */
const APPLE_CERTS = [
  { name: 'AppleWWDRCAG3.cer', url: 'https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer' },
  { name: 'AppleWWDRCAG2.cer', url: 'https://www.apple.com/certificateauthority/AppleWWDRCAG2.cer' },
  { name: 'AppleIncRootCertificate.cer', url: 'https://www.apple.com/appleca/AppleIncRootCertificate.cer' },
  { name: 'AppleRootCA-G2.cer', url: 'https://www.apple.com/certificateauthority/AppleRootCA-G2.cer' },
  { name: 'AppleRootCA-G3.cer', url: 'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer' },
]

async function ensureAppleCerts(cacheDir: string): Promise<string[]> {
  await fse.ensureDir(cacheDir)
  const certPaths: string[] = []
  
  for (const cert of APPLE_CERTS) {
    const certPath = path.join(cacheDir, cert.name)
    if (!await fse.pathExists(certPath)) {
      try {
        const response = await fetch(cert.url)
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          await fse.writeFile(certPath, buffer)
        }
      } catch (e) {
        console.warn(`Failed to download ${cert.name}:`, e)
        continue
      }
    }
    if (await fse.pathExists(certPath)) {
      certPaths.push(certPath)
    }
  }
  
  return certPaths
}

/**
 * Import P12 certificate into a temporary keychain and return the signing identity
 */
async function importCertToKeychain(
  p12Path: string,
  p12Password: string = '',
  keychainName?: string
): Promise<{ keychainPath: string; identity: string; isTemp: boolean }> {
  const tmpKeychain = keychainName || `autosigner-${Date.now()}.keychain-db`
  const keychainPath = path.join(process.env.HOME || '/tmp', 'Library', 'Keychains', tmpKeychain)
  const keychainPassword = randomUUID()

  try {
    // Create temporary keychain
    await execa('security', ['create-keychain', '-p', keychainPassword, keychainPath])
    
    // Set keychain settings (no auto-lock)
    await execa('security', ['set-keychain-settings', keychainPath])
    
    // Unlock keychain
    await execa('security', ['unlock-keychain', '-p', keychainPassword, keychainPath])
    
    // Add to search list (prepend our keychain so it's searched first)
    const { stdout: existingKeychains } = await execa('security', ['list-keychains', '-d', 'user'])
    const keychainList = existingKeychains
      .split('\n')
      .map(k => k.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
    
    // Ensure login and System keychains are included for Apple certificate chain trust
    // System keychain contains Apple WWDR intermediate certificates
    const loginKeychain = path.join(process.env.HOME || '/tmp', 'Library', 'Keychains', 'login.keychain-db')
    const systemKeychain = '/Library/Keychains/System.keychain'
    const allKeychains = [keychainPath, ...keychainList]
    if (!allKeychains.includes(loginKeychain)) {
      allKeychains.push(loginKeychain)
    }
    if (!allKeychains.includes(systemKeychain)) {
      allKeychains.push(systemKeychain)
    }
    
    await execa('security', ['list-keychains', '-d', 'user', '-s', ...allKeychains])
    
    // Import Apple WWDR intermediate certificates for chain validation
    const appleCertsDir = path.join(process.cwd(), '.apple-certs')
    const appleCerts = await ensureAppleCerts(appleCertsDir)
    for (const certPath of appleCerts) {
      try {
        await execa('security', ['import', certPath, '-k', keychainPath, '-T', '/usr/bin/codesign'])
      } catch (e) {
        // May already exist or not be needed, continue
      }
    }
    
    // Import P12 into keychain
    const importArgs = [
      'import', p12Path,
      '-k', keychainPath,
      '-P', p12Password || '',
      '-T', '/usr/bin/codesign',
      '-T', '/usr/bin/security',
      '-A' // Allow all apps to access
    ]
    await execa('security', importArgs)
    
    // Set key partition list for codesign access
    await execa('security', [
      'set-key-partition-list',
      '-S', 'apple-tool:,apple:,codesign:',
      '-s', '-k', keychainPassword,
      keychainPath
    ])
    
    // Find the signing identity
    const { stdout: identities } = await execa('security', [
      'find-identity', '-v', '-p', 'codesigning', keychainPath
    ])
    
    // Parse identity from output (format: "1) HASH "Name" ...")
    const match = identities.match(/\d+\)\s+([A-F0-9]{40})\s+"([^"]+)"/)
    if (!match) {
      throw new Error('No valid signing identity found in P12')
    }
    
    const identity = match[2] // Use the name, not the hash
    
    return { keychainPath, identity, isTemp: true }
  } catch (e) {
    // Cleanup on failure
    await execa('security', ['delete-keychain', keychainPath]).catch(() => {})
    throw e
  }
}

/**
 * Remove temporary keychain
 */
async function cleanupKeychain(keychainPath: string): Promise<void> {
  try {
    await execa('security', ['delete-keychain', keychainPath])
  } catch (e) {
    console.warn('Failed to cleanup keychain:', keychainPath, e)
  }
}

/**
 * Create a password-less P12 for ldid (which doesn't properly support passwords)
 * Works with both OpenSSL 3.x and LibreSSL (macOS built-in)
 */
async function createPasswordlessP12(
  p12Path: string,
  p12Password: string,
  outputDir: string
): Promise<string> {
  const noPassP12 = path.join(outputDir, '.ldid.p12')
  const tempKey = path.join(outputDir, '.ldid.key.pem')
  const tempCert = path.join(outputDir, '.ldid.cert.pem')
  
  // Check if openssl supports -legacy flag (OpenSSL 3.x does, LibreSSL doesn't)
  let useLegacy = false
  try {
    const { stdout } = await execa('openssl', ['version'])
    useLegacy = stdout.includes('OpenSSL 3') || stdout.includes('OpenSSL 1.1')
  } catch {}
  
  // Extract private key
  const keyArgs = [
    'pkcs12', '-in', p12Path,
    '-nocerts', '-nodes',
    '-out', tempKey,
    '-passin', `pass:${p12Password}`
  ]
  if (useLegacy) keyArgs.push('-legacy')
  await execa('openssl', keyArgs)
  
  // Extract certificate
  const certArgs = [
    'pkcs12', '-in', p12Path,
    '-clcerts', '-nokeys',
    '-out', tempCert,
    '-passin', `pass:${p12Password}`
  ]
  if (useLegacy) certArgs.push('-legacy')
  await execa('openssl', certArgs)
  
  // Re-create P12 without password
  const exportArgs = [
    'pkcs12', '-export',
    '-inkey', tempKey,
    '-in', tempCert,
    '-out', noPassP12,
    '-passout', 'pass:'
  ]
  // Only use -keypbe/-certpbe NONE if supported (not LibreSSL)
  if (useLegacy) {
    exportArgs.push('-keypbe', 'NONE', '-certpbe', 'NONE')
  }
  await execa('openssl', exportArgs)
  
  // Cleanup temp files
  await fse.remove(tempKey)
  await fse.remove(tempCert)
  
  return noPassP12
}

/**
 * Sign an .app bundle using ldid with P12 certificate
 */
async function ldidSignApp(
  appPath: string,
  p12Path: string,
  entitlementsPath: string
): Promise<void> {
  // First, sign all frameworks and plugins
  const frameworksDir = path.join(appPath, 'Frameworks')
  const pluginsDir = path.join(appPath, 'PlugIns')
  
  for (const dir of [frameworksDir, pluginsDir]) {
    if (await fse.pathExists(dir)) {
      const items = await fse.readdir(dir)
      for (const item of items) {
        const itemPath = path.join(dir, item)
        try {
          await execa('ldid', [`-K${p12Path}`, `-S${entitlementsPath}`, itemPath])
        } catch (e) {
          console.warn(`Warning: Failed to sign ${itemPath}:`, e)
        }
      }
    }
  }
  
  // Sign the main app bundle
  await execa('ldid', [`-K${p12Path}`, `-S${entitlementsPath}`, appPath])
}

/**
 * Sign an .app bundle using macOS codesign
 */
async function codesignApp(
  appPath: string,
  identity: string,
  entitlementsPath: string,
  keychainPath?: string
): Promise<void> {
  const codesignArgs = [
    '--force',
    '--sign', identity,
    '--entitlements', entitlementsPath,
  ]
  
  if (keychainPath) {
    codesignArgs.push('--keychain', keychainPath)
  }
  
  // First, sign all frameworks and plugins
  const frameworksDir = path.join(appPath, 'Frameworks')
  const pluginsDir = path.join(appPath, 'PlugIns')
  
  for (const dir of [frameworksDir, pluginsDir]) {
    if (await fse.pathExists(dir)) {
      const items = await fse.readdir(dir)
      for (const item of items) {
        const itemPath = path.join(dir, item)
        try {
          await execa('codesign', [...codesignArgs, itemPath])
        } catch (e) {
          console.warn(`Warning: Failed to sign ${itemPath}:`, e)
        }
      }
    }
  }
  
  // Sign the main app bundle
  codesignArgs.push(appPath)
  await execa('codesign', codesignArgs)
  
  // Verify the signature
  await execa('codesign', ['--verify', '--deep', '--strict', appPath])
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
    return { totalCleaned: 0, errors: ['Orphan cleanup is only applicable to local storage.'] }
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
}> {
  const staleWorkDirs = await cleanupAllStaleWorkDirectories()
  const orphaned = await cleanupOrphanedAppDirectories()
  return { staleWorkDirs, orphaned }
}

export async function signApp(appId: string): Promise<void> {
  await signAppLocally(appId)
}

/**
 * Sign an app using a specific user's credentials
 * This creates a signed version stored under the signer's directory
 */
export async function signAppForUser(appId: string, signerId: string, signedVersionId: string): Promise<void> {
  await signAppLocallyForUser(appId, signerId, signedVersionId)
}

async function signAppLocally(appId: string): Promise<void> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) throw new Error('App not found')
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'

  const source = await pickAvailableIpa(app)
  const originalIpaAbsPath = source.filePath
  if (!originalIpaAbsPath) {
    throw new Error('Source IPA not found on server storage. Re-upload the app to sign.')
  }
  let cleanupSource = source.cleanup

  let jobRoot: string | undefined
  let workDir: string | undefined
  let outputDir: string | undefined

  jobRoot = await createWorkDir(app.id)
  workDir = path.join(jobRoot, 'unpacked')
  outputDir = path.join(jobRoot, 'assets')
  await fse.ensureDir(workDir)
  await fse.ensureDir(outputDir)

  const { p12Path, p12Password, profilePath } = await ensureManagerAssetsOnDisk(app.ownerId, platform, outputDir)

  if (!p12Path) {
    throw new Error('Missing signing certificate. Upload and activate one in Profile first.')
  }
  if (!profilePath) {
    throw new Error('Missing provisioning profile. Upload and activate one in Profile first.')
  }

  // Log signing operation
  try {
    const { stdout } = await execa('security', ['cms', '-D', '-i', profilePath])
    const obj: any = plist.parse(stdout)
    const devices: string[] | undefined = obj?.ProvisionedDevices
    const allDevices: boolean | undefined = obj?.ProvisionsAllDevices
    const profileName: string | undefined = obj?.Name
    console.log('Signing with provisioning profile', {
      appId: app.id,
      ownerId: app.ownerId,
      platform,
      profileName,
      devicesCount: Array.isArray(devices) ? devices.length : 0,
      allDevices: Boolean(allDevices)
    })
  } catch (e) {
    console.warn('Failed to inspect provisioning profile before signing', e)
  }

  let keychainPath: string | undefined

  try {
    // Import certificate into temporary keychain for codesign
    const keychain = await importCertToKeychain(p12Path, p12Password || '')
    keychainPath = keychain.keychainPath
    const signingIdentity = keychain.identity
    console.log('Imported certificate, identity:', signingIdentity)

    // 1) Unzip IPA
    await execa('unzip', ['-o', originalIpaAbsPath, '-d', workDir!])
    
    const payloadDir = path.join(workDir!, 'Payload')
    const appDirs = (await fse.readdir(payloadDir) as string[]).filter((n: string) => n.endsWith('.app'))
    if (appDirs.length === 0) throw new Error('No .app found in IPA')
    const appDir = path.join(payloadDir, appDirs[0])

    // 2) Extract entitlements from provisioning profile
    // Use a temp file approach for more reliable extraction
    const provTempPlist = path.join(workDir!, 'profile_content.plist')
    await execa('security', ['cms', '-D', '-i', profilePath, '-o', provTempPlist])
    const provContent = await fse.readFile(provTempPlist, 'utf8')
    const provObj: any = plist.parse(provContent)
    
    const entitlementsObj = provObj?.Entitlements || {}
    console.log('Extracted entitlements:', JSON.stringify(entitlementsObj, null, 2))
    
    if (!entitlementsObj || Object.keys(entitlementsObj).length === 0) {
      throw new Error('Failed to extract entitlements from provisioning profile')
    }
    
    const entitlementsPlist = plist.build(entitlementsObj as any)
    const entPath = path.join(workDir!, 'entitlements.plist')
    await fse.writeFile(entPath, entitlementsPlist)
    console.log('Wrote entitlements to:', entPath)

    // 3) Embed the new provisioning profile
    await fse.copyFile(profilePath, path.join(appDir, 'embedded.mobileprovision'))

    // 4) Update bundle ID if specified
    if (app.bundleId) {
      const infoPlistPath = path.join(appDir, 'Info.plist')
      try {
        // Convert binary plist to XML if needed
        await execa('plutil', ['-convert', 'xml1', infoPlistPath])
        const infoBuf = await fse.readFile(infoPlistPath)
        const info = plist.parse(infoBuf.toString('utf8')) as any
        info.CFBundleIdentifier = app.bundleId
        await fse.writeFile(infoPlistPath, plist.build(info))
      } catch (e) {
        console.warn('Failed to update bundle ID:', e)
      }
    }

    // 5) Remove old code signature
    const codeSignatureDir = path.join(appDir, '_CodeSignature')
    await fse.remove(codeSignatureDir).catch(() => {})

    // 6) Sign the app using codesign
    await codesignApp(appDir, signingIdentity, entPath, keychainPath)

    // 7) Repack IPA
    const signedPath = path.join(outputDir!, `${app.id}-signed.ipa`)
    
    // Use ditto or zip to repack
    await execa('bash', ['-c', `cd "${workDir}" && zip -qry "${signedPath}" Payload`])

    // Finalize
    await finalizeSignedArtifact(app, signedPath)
    
    // Clean up ALL old work directories for this IPA after successful signing
    // This ensures we don't leave stale directories from previous signing attempts
  } catch (e) {
    console.error('Signing failed:', e)
    throw e
  } finally {
    if (jobRoot) {
      await fse.remove(jobRoot).catch((err) => {
        console.warn(`Failed to cleanup job directory ${jobRoot}:`, err)
      })
    }
    await cleanupSource().catch(() => {})
    // Cleanup temporary keychain
    if (keychainPath) {
      await cleanupKeychain(keychainPath)
    }
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
  
  const where: any = { ownerId: userId }
  if (platform) where.platform = platform
  const apps = await prisma.app.findMany({ where, orderBy: { uploadedAt: 'desc' } })
  for (const a of apps) {
    try {
      await prisma.app.update({ where: { id: a.id }, data: { status: 'SIGNING', signedAt: null } })
      // Use the signing queue instead of direct signing
      await signingQueue.enqueueOwnerSigning(a.id, userId)
    } catch (e) {
      console.error(`Failed to queue re-signing for app ${a.id}:`, e)
    }
  }
}

/**
 * Sign an app locally using a specific user's credentials
 * Creates a signed version stored in the signer's uploads directory
 */
async function signAppLocallyForUser(appId: string, signerId: string, signedVersionId: string): Promise<void> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) throw new Error('App not found')
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'

  // Get the original IPA from storage
  const source = await pickAvailableIpa(app)
  const originalIpaAbsPath = source.filePath
  if (!originalIpaAbsPath) {
    throw new Error('Source IPA not found on server storage.')
  }
  let cleanupSource = source.cleanup

  let jobRoot: string | undefined
  let workDir: string | undefined
  let outputDir: string | undefined
  let keychainPath: string | undefined

  try {
    jobRoot = await createWorkDir(`${signerId}-${signedVersionId}`)
    workDir = path.join(jobRoot, 'unpacked')
    outputDir = path.join(jobRoot, 'assets')
    await fse.ensureDir(workDir)
    await fse.ensureDir(outputDir)

    const { p12Path, p12Password, profilePath } = await ensureManagerAssetsOnDisk(signerId, platform, outputDir)

    if (!p12Path) {
      throw new Error('Missing signing certificate. Upload and activate one in Profile first.')
    }
    if (!profilePath) {
      throw new Error('Missing provisioning profile. Upload and activate one in Profile first.')
    }

    try {
      const { stdout } = await execa('security', ['cms', '-D', '-i', profilePath])
      const obj: any = plist.parse(stdout)
      const devices: string[] | undefined = obj?.ProvisionedDevices
      const allDevices: boolean | undefined = obj?.ProvisionsAllDevices
      const profileName: string | undefined = obj?.Name
      console.log('Signing for user', signerId, 'with provisioning profile', {
        appId: app.id,
        signerId,
        platform,
        profileName,
        devicesCount: Array.isArray(devices) ? devices.length : 0,
        allDevices: Boolean(allDevices)
      })
    } catch (e) {
      console.warn('Failed to inspect provisioning profile before signing', e)
    }

    // Import certificate into temporary keychain for codesign
    const keychain = await importCertToKeychain(p12Path, p12Password || '')
    keychainPath = keychain.keychainPath
    const signingIdentity = keychain.identity
    console.log('Imported certificate, identity:', signingIdentity)

    await execa('unzip', ['-o', originalIpaAbsPath, '-d', workDir!])
    
    const payloadDir = path.join(workDir!, 'Payload')
    const appDirs = (await fse.readdir(payloadDir) as string[]).filter((n: string) => n.endsWith('.app'))
    if (appDirs.length === 0) throw new Error('No .app found in IPA')
    const appDir = path.join(payloadDir, appDirs[0])

    // 2) Extract entitlements from provisioning profile
    const provTempPlist = path.join(workDir!, 'profile_content.plist')
    await execa('security', ['cms', '-D', '-i', profilePath, '-o', provTempPlist])
    const provContent = await fse.readFile(provTempPlist, 'utf8')
    const provObj: any = plist.parse(provContent)
    
    const entitlementsObj = provObj?.Entitlements || {}
    console.log('Extracted entitlements:', JSON.stringify(entitlementsObj, null, 2))
    
    if (!entitlementsObj || Object.keys(entitlementsObj).length === 0) {
      throw new Error('Failed to extract entitlements from provisioning profile')
    }
    
    const entitlementsPlist = plist.build(entitlementsObj as any)
    const entPath = path.join(workDir!, 'entitlements.plist')
    await fse.writeFile(entPath, entitlementsPlist)

    // 3) Embed the new provisioning profile
    await fse.copyFile(profilePath, path.join(appDir, 'embedded.mobileprovision'))

    // 4) Update bundle ID if specified
    if (app.bundleId) {
      const infoPlistPath = path.join(appDir, 'Info.plist')
      try {
        await execa('plutil', ['-convert', 'xml1', infoPlistPath])
        const infoBuf = await fse.readFile(infoPlistPath)
        const info = plist.parse(infoBuf.toString('utf8')) as any
        info.CFBundleIdentifier = app.bundleId
        await fse.writeFile(infoPlistPath, plist.build(info))
      } catch (e) {
        console.warn('Failed to update bundle ID:', e)
      }
    }

    // 5) Remove old code signature
    const codeSignatureDir = path.join(appDir, '_CodeSignature')
    await fse.remove(codeSignatureDir).catch(() => {})

    // 6) Sign the app using codesign
    await codesignApp(appDir, signingIdentity, entPath, keychainPath)

    // 7) Repack IPA
    const signedPath = path.join(outputDir!, `${signedVersionId}-signed.ipa`)
    await execa('bash', ['-c', `cd "${workDir}" && zip -qry "${signedPath}" Payload`])

    // Finalize - update SignedVersion record
    await finalizeSignedVersionArtifact(app, signerId, signedVersionId, signedPath)
    
  } catch (e) {
    console.error('Signing failed for user', signerId, ':', e)
    throw e
  } finally {
    if (jobRoot) {
      await fse.remove(jobRoot).catch((err) => {
        console.warn(`Failed to cleanup job directory ${jobRoot}:`, err)
      })
    }
    await cleanupSource().catch(() => {})
    if (keychainPath) {
      await cleanupKeychain(keychainPath)
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
