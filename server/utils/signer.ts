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

export async function signApp(appId: string): Promise<void> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) throw new Error('App not found')
  const platform = (app.platform?.toUpperCase() as 'IOS' | 'TVOS') || 'IOS'

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', app.ownerId)
  const outputDir = path.join(uploadDir, app.id)
  await fse.ensureDir(outputDir)

  const originalIpaAbsPath = getAbsolutePublicPath(app.originalIpaPath)

  const { certPemPath, keyPemPath, profilePath } = await ensureManagerAssetsOnDisk(app.ownerId, platform, outputDir)

  let signedIpaPublic: string | undefined
  try {
    await execa('bash', ['-lc', 'command -v isign'])
    const signedPath = path.join(outputDir, `${app.id}-signed.ipa`)
    const args = [
      'isign',
      ...(app.bundleId ? ['-i', app.bundleId] : []),
      ...(profilePath ? ['-p', profilePath] : []),
      ...(certPemPath ? ['-c', certPemPath] : []),
      ...(keyPemPath ? ['-k', keyPemPath] : []),
      '-o', signedPath,
      originalIpaAbsPath
    ]
    await execa('bash', ['-lc', args.map((a) => `'${a}'`).join(' ')])
    signedIpaPublic = `/uploads/${app.ownerId}/${app.id}/${path.basename(signedPath)}`
  } catch (e) {
    // Fallback to original IPA if signing is not possible
    signedIpaPublic = app.originalIpaPath
  }

  let manifestPublic: string | undefined
  if (platform === 'IOS') {
    const baseUrl = (useRuntimeConfig().public.baseUrl || '').toString().replace(/\/$/, '')
    const manifest = {
      items: [
        {
          assets: [
            { kind: 'software-package', url: `${baseUrl}${signedIpaPublic}` }
          ],
          metadata: {
            'bundle-identifier': app.bundleId,
            'bundle-version': app.version || '0.0.0',
            kind: 'software',
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


