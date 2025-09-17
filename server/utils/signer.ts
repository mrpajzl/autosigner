import path from 'node:path'
// @ts-ignore
import fse from 'fs-extra'
import { execa } from 'execa'
// @ts-ignore
import plist from 'plist'
// @ts-ignore
import bplist from 'bplist-parser'
import { prisma } from './db'
import { decrypt } from './crypto'

function getAbsolutePublicPath(publicPath: string): string {
  const rel = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
  return path.join(process.cwd(), 'public', rel)
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

async function ensureManagerAssetsOnDisk(userId: string, platform: 'IOS' | 'TVOS', intoDir: string): Promise<{ certPemPath?: string; keyPemPath?: string; profilePath?: string; p12Password?: string; p12Path?: string }> {
  const prof = await prisma.managerProfile.findUnique({ where: { userId } })
  const activeCert = await prisma.certificate.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } })
  const activeProfile = await prisma.provisioningProfile.findFirst({ where: { userId, platform, active: true }, orderBy: { createdAt: 'desc' } })

  await fse.ensureDir(intoDir)
  let certPemPath: string | undefined
  let keyPemPath: string | undefined
  let profilePath: string | undefined
  let p12Password: string | undefined
  let p12Path: string | undefined

  // Prefer new Certificate records (p12 → extract PEMs); fallback to legacy ManagerProfile fields
  if (activeCert?.p12Data) {
    try {
      p12Path = path.join(intoDir, 'cert.p12')
      await fse.writeFile(p12Path, Buffer.from(activeCert.p12Data))
      certPemPath = path.join(intoDir, 'cert.pem')
      keyPemPath = path.join(intoDir, 'key.pem')
      const pass = activeCert.p12PasswordEnc ? decrypt(JSON.parse(activeCert.p12PasswordEnc)).toString('utf8') : undefined
      const passArg = pass ? ['-passin', `pass:${pass}`] : []
      await execa('bash', ['-lc', [`openssl`, `pkcs12`, `-in`, p12Path, `-clcerts`, `-nokeys`, `-out`, certPemPath, ...passArg].map(String).join(' ')])
      await execa('bash', ['-lc', [`openssl`, `pkcs12`, `-in`, p12Path, `-nocerts`, `-nodes`, `-out`, keyPemPath, ...passArg].map(String).join(' ')])
      p12Password = pass
    } catch {}
  } else if (prof?.certificatePem) {
    try {
      const payload = JSON.parse(prof.certificatePem)
      const buf = decrypt(payload)
      certPemPath = path.join(intoDir, 'cert.pem')
      await fse.writeFile(certPemPath, buf)
    } catch {}
  }
  if (prof?.privateKeyPem && !keyPemPath) {
    try {
      const payload = JSON.parse(prof.privateKeyPem)
      const buf = decrypt(payload)
      keyPemPath = path.join(intoDir, 'key.pem')
      await fse.writeFile(keyPemPath, buf)
    } catch {}
  }
  if (prof?.p12PasswordEnc) {
    try {
      const payload = JSON.parse(prof.p12PasswordEnc)
      const buf = decrypt(payload)
      p12Password = buf.toString('utf8')
    } catch {}
  }
  const mobileprov = activeProfile?.data || (platform === 'IOS' ? prof?.mobileprovisionIos : prof?.mobileprovisionTvos)
  if (mobileprov) {
    profilePath = path.join(intoDir, 'profile.mobileprovision')
    await fse.writeFile(profilePath, Buffer.from(mobileprov))
  }

  return { certPemPath, keyPemPath, profilePath, p12Password, p12Path }
}

// Remove macOS-only applesign path; Linux-only signer uses ldid

export async function signApp(appId: string): Promise<void> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) throw new Error('App not found')
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', app.ownerId)
  const outputDir = path.join(uploadDir, app.id)
  await fse.ensureDir(outputDir)

  const originalIpaAbsPath = getAbsolutePublicPath(app.originalIpaPath)

  const { certPemPath, keyPemPath, profilePath, p12Path, p12Password } = await ensureManagerAssetsOnDisk(app.ownerId, platform, outputDir)

  // Basic preflight checks to avoid silent fallbacks
  // Prefer ldid on Linux; applesign requires macOS keychain identities
  // Linux-only: require ldid
  try {
    await execa('bash', ['-lc', 'command -v ldid'])
  } catch {
    throw new Error('ldid is not installed')
  }
  if (!certPemPath || !keyPemPath || !profilePath) {
    throw new Error('Missing signing assets (certificate/key/profile). Upload and activate them in Profile first.')
  }

  // Inspect provisioning profile for device support (optional diagnostics)
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

  let signedIpaPublic: string | undefined
  const signedPath = path.join(outputDir, `${app.id}-signed.ipa`)
  // ldid flow only:
  // 1) Unzip IPA
  // 2) Extract entitlements from provisioning profile
  // 3) Re-sign main binary and frameworks with ldid -S<entitlements> -K key.pem -M cert.pem
  // 4) Repack IPA
  const workDir = `${originalIpaAbsPath}.${Date.now().toString(36)}`
  await fse.ensureDir(workDir)
  await execa('unzip', ['-o', originalIpaAbsPath, '-d', workDir])
  const payloadDir = path.join(workDir, 'Payload')
  const appDirs = (await fse.readdir(payloadDir) as string[]).filter((n: string) => n.endsWith('.app'))
  if (appDirs.length === 0) throw new Error('No .app found in IPA')
  const appDir = path.join(payloadDir, appDirs[0])

  // Extract entitlements plist from mobileprovision (handle XML or binary plist)
  const provExec: any = await execa('openssl', ['smime', '-inform', 'der', '-verify', '-noverify', '-in', profilePath, '-out', '-'], { encoding: 'buffer' } as any)
  const provBuf: Buffer = provExec.stdout as unknown as Buffer
  const provObj: any = parsePlistBuffer(provBuf) || {}
  const entitlementsObj = provObj?.Entitlements || {}
  const entitlementsPlist = plist.build(entitlementsObj as any)
  const entPath = path.join(workDir, 'entitlements.plist')
  await fse.writeFile(entPath, entitlementsPlist)

  // Sign main executable (handle XML or binary Info.plist)
  const infoPlistPath = path.join(appDir, 'Info.plist')
  const infoBuf = await fse.readFile(infoPlistPath)
  const info = parsePlistBuffer(infoBuf) as any
  const execName = info.CFBundleExecutable as string
  const execPath = path.join(appDir, execName)
  if (p12Path) {
    const args = ['-S', entPath, '-K', p12Path]
    if (p12Password && p12Password.length > 0) args.push('-U', p12Password)
    args.push(execPath)
    await execa('ldid', args)
  } else {
    await execa('ldid', ['-S', entPath, '-K', keyPemPath!, '-M', certPemPath!, execPath])
  }

  // Sign embedded frameworks and plugins (best-effort)
  const signDirIfExists = async (dir: string) => {
    if (await fse.pathExists(dir)) {
      const items = await fse.readdir(dir)
      for (const item of items) {
        const p = path.join(dir, item)
        try {
          if (p12Path) {
            const fwArgs = ['-S', entPath, '-K', p12Path]
            if (p12Password && p12Password.length > 0) fwArgs.push('-U', p12Password)
            fwArgs.push(p)
            await execa('ldid', fwArgs)
          } else {
            await execa('ldid', ['-S', entPath, '-K', keyPemPath!, '-M', certPemPath!, p])
          }
        } catch {}
      }
    }
  }
  await signDirIfExists(path.join(appDir, 'Frameworks'))
  await signDirIfExists(path.join(appDir, 'PlugIns'))

  // Embed provisioning profile
  await fse.copyFile(profilePath, path.join(appDir, 'embedded.mobileprovision'))

  // Repack IPA
  const cwd = path.dirname(workDir)
  const base = path.basename(workDir)
  await execa('bash', ['-lc', `cd '${cwd}' && zip -qry '${signedPath}' '${base}/Payload'`])
  await fse.remove(workDir)
  signedIpaPublic = `/uploads/${app.ownerId}/${app.id}/${path.basename(signedPath)}`

  let manifestPublic: string | undefined
  if (platform === 'IOS') {
    const baseUrl = (useRuntimeConfig().public.baseUrl || '').toString().replace(/\/$/, '')
    const platformIdentifier = platform === 'TVOS' ? 'com.apple.platform.appletvos' : 'com.apple.platform.iphoneos'
    const iconRel = (app.iconPath || '').replace(/^\//, '')
    const iconUrl = iconRel ? `${baseUrl}/${iconRel}` : undefined
    const assets: any[] = [
      { kind: 'software-package', url: `${baseUrl}/api/download/${(signedIpaPublic || '').replace(/^\//, '')}` }
    ]
    if (iconUrl) {
      assets.push({ kind: 'display-image', url: iconUrl })
    }
    // Add full-size-image pointing to IPA URL to mimic working example
    assets.push({ kind: 'full-size-image', url: `${baseUrl}/api/download/${(signedIpaPublic || '').replace(/^\//, '')}` })

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
    const manifestPath = path.join(outputDir, 'manifest.plist')
    await fse.writeFile(manifestPath, plistXml)
    manifestPublic = `/uploads/${app.ownerId}/${app.id}/manifest.plist`
  }

  await prisma.app.update({
    where: { id: app.id },
    data: { status: 'SIGNED', signedAt: new Date(), signedIpaPath: signedIpaPublic, manifestPath: manifestPublic }
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


