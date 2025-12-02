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
import { useRuntimeConfig } from '#imports'

function getAbsolutePublicPath(publicPath: string): string {
  const rel = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
  return path.join(process.cwd(), 'public', rel)
}

function getPublicBaseUrl(): string {
  try {
    return (useRuntimeConfig().public.baseUrl || '').toString().replace(/\/$/, '')
  } catch {
    return ''
  }
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

export async function signApp(appId: string): Promise<void> {
  await signAppLocally(appId)
}

async function signAppLocally(appId: string): Promise<void> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) throw new Error('App not found')
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', app.ownerId)
  const outputDir = path.join(uploadDir, app.id)
  await fse.ensureDir(outputDir)

  const originalIpaAbsPath = pickAvailableIpa(app)
  if (!originalIpaAbsPath) {
    throw new Error('Source IPA not found on server storage. Re-upload the app to sign.')
  }

  const { p12Path, p12Password, profilePath } = await ensureManagerAssetsOnDisk(app.ownerId, platform, outputDir)

  if (!p12Path) {
    throw new Error('Missing signing certificate. Upload and activate one in Profile first.')
  }
  if (!profilePath) {
    throw new Error('Missing provisioning profile. Upload and activate one in Profile first.')
  }

  // Log signing operation
  try {
    const { stdout } = await execa('openssl', ['smime', '-inform', 'der', '-verify', '-noverify', '-in', profilePath, '-out', '-'])
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
    const workDir = `${originalIpaAbsPath}.${Date.now().toString(36)}`
    await fse.ensureDir(workDir)
    await execa('unzip', ['-o', originalIpaAbsPath, '-d', workDir])
    
    const payloadDir = path.join(workDir, 'Payload')
    const appDirs = (await fse.readdir(payloadDir) as string[]).filter((n: string) => n.endsWith('.app'))
    if (appDirs.length === 0) throw new Error('No .app found in IPA')
    const appDir = path.join(payloadDir, appDirs[0])

    // 2) Extract entitlements from provisioning profile
    const provExec: any = await execa('openssl', ['smime', '-inform', 'der', '-verify', '-noverify', '-in', profilePath, '-out', '-'], { encoding: 'buffer' } as any)
    const provBuf: Buffer = provExec.stdout as unknown as Buffer
    const provObj: any = parsePlistBuffer(provBuf) || {}
    const entitlementsObj = provObj?.Entitlements || {}
    const entitlementsPlist = plist.build(entitlementsObj as any)
    const entPath = path.join(workDir, 'entitlements.plist')
    await fse.writeFile(entPath, entitlementsPlist)

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
    const signedPath = path.join(outputDir, `${app.id}-signed.ipa`)
    
    // Use ditto or zip to repack
    await execa('bash', ['-c', `cd "${workDir}" && zip -qry "${signedPath}" Payload`])
    
    // Cleanup work directory
    await fse.remove(workDir)

    // Finalize
    await finalizeSignedArtifact(app, signedPath)
    
  } catch (e) {
    console.error('Signing failed:', e)
    throw e
  } finally {
    // Cleanup temporary keychain
    if (keychainPath) {
      await cleanupKeychain(keychainPath)
    }
  }
}

function pickAvailableIpa(app: AppModel): string {
  const candidates: (string | null | undefined)[] = [app.signedIpaPath, app.originalIpaPath]
  for (const p of candidates) {
    if (!p) continue
    const abs = getAbsolutePublicPath(p)
    if (fse.existsSync(abs)) return abs
  }
  return ''
}

async function finalizeSignedArtifact(app: AppModel, signedFilePath: string): Promise<void> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', app.ownerId, app.id)
  await fse.ensureDir(uploadDir)
  const finalPath = path.join(uploadDir, `${app.id}-signed.ipa`)
  const resolvedFinal = path.resolve(finalPath)
  const resolvedSource = path.resolve(signedFilePath)
  if (resolvedFinal !== resolvedSource) {
    await fse.move(signedFilePath, finalPath, { overwrite: true })
  }
  const signedPublic = `/uploads/${app.ownerId}/${app.id}/${path.basename(finalPath)}`
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
  const manifestPath = path.join(uploadDir, 'manifest.plist')
  await fse.writeFile(manifestPath, plistXml)
  manifestPublic = `/uploads/${app.ownerId}/${app.id}/manifest.plist`

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
  const where: any = { ownerId: userId }
  if (platform) where.platform = platform
  const apps = await prisma.app.findMany({ where, orderBy: { uploadedAt: 'desc' } })
  for (const a of apps) {
    try {
      await prisma.app.update({ where: { id: a.id }, data: { status: 'SIGNING', signedAt: null } })
      await signApp(a.id)
    } catch (e) {
      await prisma.app.update({ where: { id: a.id }, data: { status: 'FAILED' } })
    }
  }
}
