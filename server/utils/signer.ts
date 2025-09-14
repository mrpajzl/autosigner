import path from 'node:path'
import fse from 'fs-extra'
import { execa } from 'execa'
import plist from 'plist'
import { prisma } from './db'
import { decrypt } from './crypto'

function getAbsolutePublicPath(publicPath: string): string {
  const rel = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath
  return path.join(process.cwd(), 'public', rel)
}

async function ensureManagerAssetsOnDisk(userId: string, platform: 'IOS' | 'TVOS', intoDir: string): Promise<{ certPemPath?: string; keyPemPath?: string; profilePath?: string; p12Password?: string }> {
  const prof = await prisma.managerProfile.findUnique({ where: { userId } })
  const activeCert = await prisma.certificate.findFirst({ where: { userId, active: true }, orderBy: { createdAt: 'desc' } })
  const activeProfile = await prisma.provisioningProfile.findFirst({ where: { userId, platform, active: true }, orderBy: { createdAt: 'desc' } })

  await fse.ensureDir(intoDir)
  let certPemPath: string | undefined
  let keyPemPath: string | undefined
  let profilePath: string | undefined
  let p12Password: string | undefined

  // Prefer new Certificate records (p12 → extract PEMs); fallback to legacy ManagerProfile fields
  if (activeCert?.p12Data) {
    try {
      const p12Path = path.join(intoDir, 'cert.p12')
      await fse.writeFile(p12Path, Buffer.from(activeCert.p12Data))
      certPemPath = path.join(intoDir, 'cert.pem')
      keyPemPath = path.join(intoDir, 'key.pem')
      const pass = activeCert.p12PasswordEnc ? decrypt(JSON.parse(activeCert.p12PasswordEnc)).toString('utf8') : undefined
      const passArg = pass ? ['-passin', `pass:${pass}`] : []
      await execa('bash', ['-lc', [`openssl`, `pkcs12`, `-in`, p12Path, `-clcerts`, `-nokeys`, `-out`, certPemPath, ...passArg].map(String).join(' ')])
      await execa('bash', ['-lc', [`openssl`, `pkcs12`, `-in`, p12Path, `-nocerts`, `-nodes`, `-out`, keyPemPath, ...passArg].map(String).join(' ')])
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

  return { certPemPath, keyPemPath, profilePath, p12Password }
}

async function resolveIsignCommand(): Promise<{ cmd: string; baseArgs: string[] } | null> {
  // Try common binary locations first
  const binaryCandidates = [
    'isign',
    '/opt/homebrew/bin/isign',
    '/usr/local/bin/isign'
  ]
  for (const cand of binaryCandidates) {
    try {
      await execa(cand, ['--help'])
      return { cmd: cand, baseArgs: [] }
    } catch {}
  }
  // Try python module fallback with common python executables
  const pythonCandidates = ['python3', '/opt/homebrew/bin/python3', '/usr/local/bin/python3', 'python']
  for (const py of pythonCandidates) {
    try {
      await execa(py, ['-c', 'import isign'])
      return { cmd: py, baseArgs: ['-m', 'isign'] }
    } catch {}
  }
  return null
}

export async function signApp(appId: string): Promise<void> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) throw new Error('App not found')
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', app.ownerId)
  const outputDir = path.join(uploadDir, app.id)
  await fse.ensureDir(outputDir)

  const originalIpaAbsPath = getAbsolutePublicPath(app.originalIpaPath)

  const { certPemPath, keyPemPath, profilePath } = await ensureManagerAssetsOnDisk(app.ownerId, platform, outputDir)

  // Basic preflight checks to avoid silent fallbacks
  const isignResolved = await resolveIsignCommand()
  if (!isignResolved) throw new Error('Signing tool isign is not installed (binary or python module)')
  if (!certPemPath || !keyPemPath || !profilePath) {
    throw new Error('Missing signing assets (certificate/key/profile). Upload and activate them in Profile first.')
  }

  // Inspect provisioning profile for device support (optional diagnostics)
  try {
    const { stdout } = await execa('bash', ['-lc', 'openssl smime -inform der -verify -noverify -in /dev/stdin -out /dev/stdout'], { input: await fse.readFile(profilePath) })
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
  const args = [
    ...isignResolved.baseArgs,
    ...(app.bundleId ? ['-i', app.bundleId] : []),
    '-p', profilePath,
    '-c', certPemPath,
    '-k', keyPemPath,
    '-o', signedPath,
    originalIpaAbsPath
  ]
  await execa(isignResolved.cmd, args)
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


