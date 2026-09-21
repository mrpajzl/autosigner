// Shared macOS signing engine. No database, storage or Nuxt dependency.
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import fse from 'fs-extra'
import { execa } from 'execa'
import plist from 'plist'
import { nestedCodeTargets } from './nested-code'

const context = new AsyncLocalStorage<AbortSignal>()
async function run(command: string, args: string[], options: { cwd?: string } = {}) {
  try {
    return await execa(command, args, { ...options, cancelSignal: context.getStore(), forceKillAfterDelay: 5000, maxBuffer: 16 * 1024 * 1024 })
  } catch {
    // Execa errors contain argv, including keychain/P12 passwords. Never propagate them.
    throw new Error(`Signing tool ${command} failed`)
  }
}

export interface SignInput {
  sourcePath: string
  p12Path: string
  p12Password: string
  profilePath: string
  bundleId?: string | null
  outputPath: string
  workDir: string
}

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
        const response = await fetch(cert.url, { signal: AbortSignal.timeout(15000) })
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          await fse.writeFile(certPath, buffer)
        }
      } catch (e) {
        console.warn(`Failed to download ${cert.name}`)
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
): Promise<{ keychainPath: string; identity: string; identityName: string; isTemp: boolean }> {
  const tmpKeychain = keychainName || `fastsigner-${randomUUID()}.keychain-db`
  const keychainPath = path.join(process.env.HOME || '/tmp', 'Library', 'Keychains', tmpKeychain)
  const keychainPassword = randomUUID()

  try {
    // Create temporary keychain
    await run('security', ['create-keychain', '-p', keychainPassword, keychainPath])
    
    // Set keychain settings (no auto-lock)
    await run('security', ['set-keychain-settings', keychainPath])
    
    // Unlock keychain
    await run('security', ['unlock-keychain', '-p', keychainPassword, keychainPath])
    
    // Add to search list (prepend our keychain so it's searched first)
    const { stdout: existingKeychains } = await run('security', ['list-keychains', '-d', 'user'])
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
    
    await run('security', ['list-keychains', '-d', 'user', '-s', ...allKeychains])
    
    // Import Apple WWDR intermediate certificates for chain validation
    const appleCertsDir = path.join(process.env.FASTSIGNER_STATE_DIR || process.cwd(), '.apple-certs')
    const appleCerts = await ensureAppleCerts(appleCertsDir)
    for (const certPath of appleCerts) {
      try {
        await run('security', ['import', certPath, '-k', keychainPath, '-T', '/usr/bin/codesign'])
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
    await run('security', importArgs)
    
    // Set key partition list for codesign access
    await run('security', [
      'set-key-partition-list',
      '-S', 'apple-tool:,apple:,codesign:',
      '-s', '-k', keychainPassword,
      keychainPath
    ])
    
    // Find the signing identity
    const { stdout: identities } = await run('security', [
      'find-identity', '-v', '-p', 'codesigning', keychainPath
    ])
    
    // Parse identity from output (format: "1) HASH "Name" ...")
    const match = identities.match(/\d+\)\s+([A-F0-9]{40})\s+"([^"]+)"/)
    if (!match) {
      throw new Error('No valid signing identity found in P12')
    }
    
    const identityHash = match[1] // SHA-1 hash - use this to avoid ambiguity
    const identityName = match[2] // Name for display
    
    // Return hash as identity to avoid ambiguity when same cert exists in multiple keychains
    return { keychainPath, identity: identityHash, identityName, isTemp: true }
  } catch (e) {
    // Cleanup on failure
    await execa('security', ['delete-keychain', keychainPath], { timeout: 15000 }).catch(() => {})
    throw e
  }
}

/**
 * Remove temporary keychain
 */
async function cleanupKeychain(keychainPath: string): Promise<void> {
  try {
    await run('security', ['delete-keychain', keychainPath])
  } catch (e) {
    console.warn('Failed to cleanup temporary keychain')
  }
}


export async function signIpa(input: SignInput, signal: AbortSignal): Promise<void> {
  if (process.platform !== 'darwin') throw new Error('Native signing requires macOS; configure SIGNING_BACKEND=ssh on the VPS')
  await context.run(signal, async () => {
    signal.throwIfAborted()
    const { stdout: searchList } = await run('security', ['list-keychains', '-d', 'user'])
    const originalKeychains = searchList.split('\n').map(k => k.trim().replace(/^"|"$/g, '')).filter(Boolean)
    let keychainPath: string | undefined
    try {
      const keychain = await importCertToKeychain(input.p12Path, input.p12Password)
      keychainPath = keychain.keychainPath
      await fse.ensureDir(input.workDir)
      const { stdout: entries } = await run('unzip', ['-Z1', input.sourcePath])
      if (entries.split('\n').some(entry => entry.startsWith('/') || entry.split('/').includes('..'))) {
        throw new Error('Unsafe archive entry')
      }
      await run('unzip', ['-oq', input.sourcePath, '-d', input.workDir])
      // Reject symlinks escaping the unpacked archive before invoking signing tools.
      async function checkLinks(dir: string): Promise<void> {
        for (const entry of await fse.readdir(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name)
          if (entry.isSymbolicLink()) {
            const target = await fse.realpath(file)
            if (!target.startsWith(path.resolve(input.workDir) + path.sep)) throw new Error('Unsafe archive symlink')
          } else if (entry.isDirectory()) await checkLinks(file)
        }
      }
      await checkLinks(input.workDir)
      const payloadDir = path.join(input.workDir, 'Payload')
      const apps = (await fse.readdir(payloadDir)).filter((name: string) => name.endsWith('.app'))
      if (apps.length !== 1) throw new Error('IPA must contain one main app')
      const appDir = path.join(payloadDir, apps[0])
      const { stdout: profileXml } = await run('security', ['cms', '-D', '-i', input.profilePath])
      const profile = plist.parse(profileXml) as any
      if (!profile.Entitlements || !Object.keys(profile.Entitlements).length) throw new Error('Missing profile entitlements')
      const entitlementsPath = path.join(input.workDir, 'entitlements.plist')
      await fse.writeFile(entitlementsPath, plist.build(profile.Entitlements))
      await fse.copyFile(input.profilePath, path.join(appDir, 'embedded.mobileprovision'))
      if (input.bundleId) {
        const infoPath = path.join(appDir, 'Info.plist')
        await run('plutil', ['-convert', 'xml1', infoPath])
        const info = plist.parse(await fse.readFile(infoPath, 'utf8')) as any
        info.CFBundleIdentifier = input.bundleId
        await fse.writeFile(infoPath, plist.build(info))
      }
      await fse.remove(path.join(appDir, '_CodeSignature'))
      const args = ['--force', '--sign', keychain.identity, '--entitlements', entitlementsPath, '--keychain', keychainPath]
      for (const target of await nestedCodeTargets(appDir, signal)) await run('codesign', [...args, target])
      await run('codesign', [...args, appDir])
      await run('codesign', ['--verify', '--deep', '--strict', appDir])
      await run('zip', ['-qry', path.resolve(input.outputPath), 'Payload'], { cwd: input.workDir })
    } finally {
      // Cleanup must still execute after the signing deadline or SSH disconnect.
      await context.run(undefined as any, async () => {
        if (keychainPath) await cleanupKeychain(keychainPath)
        await execa('security', ['list-keychains', '-d', 'user', '-s', ...originalKeychains], { timeout: 15000 }).catch(() => {})
      })
    }
  })
}
