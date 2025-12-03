import { requireAnyRole } from '../../utils/auth'
// @ts-ignore - formidable types provided via local shim
import formidable from 'formidable'
// @ts-ignore - fs-extra types provided via local shim
import fse from 'fs-extra'
import { prisma } from '../../utils/db'
import { execa } from 'execa'
import path from 'node:path'
// @ts-ignore - plist types provided via local shim
import plist from 'plist'
import { encrypt } from '../../utils/crypto'
import { signApp } from '../../utils/signer'
import { storage } from '../../utils/storage'
import { createRequire } from 'node:module'

export const config = { api: { bodyParser: false } }

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const uploadDir = path.join(process.cwd(), '.storage-tmp', 'incoming', user.id)
  await fse.ensureDir(uploadDir)

  const form = formidable({ multiples: true, uploadDir, keepExtensions: true })
  const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(event.node.req, (err: any, fields: any, files: any) => (err ? reject(err) : resolve({ fields, files })))
  })

  const getField = (key: keyof typeof fields): string | undefined => {
    const v = fields[key]
    if (Array.isArray(v)) return v[0] ? String(v[0]) : undefined
    if (v === undefined || v === null) return undefined
    const s = String(v).trim()
    return s.length ? s : undefined
  }

  const appId = getField('appId')
  const nameFromForm = getField('name') || 'Unnamed App'
  let bundleId = getField('bundleId') || ''
  let version = getField('version')
  let buildNumber = getField('buildNumber')
  const platformFromForm = (getField('platform') || 'IOS').toUpperCase()
  const ipaFile = Array.isArray(files.ipa) ? files.ipa[0] : (files.ipa as formidable.File)
  if (!ipaFile?.filepath) throw createError({ statusCode: 400, message: 'IPA required' })

  // Preserve original filename when possible and avoid moving onto the same path
  const originalIpaFileName = ipaFile.originalFilename
    ? path.basename(ipaFile.originalFilename)
    : path.basename(ipaFile.filepath)
  const originalIpaAbsPath = path.join(uploadDir, originalIpaFileName)
  if (ipaFile.filepath !== originalIpaAbsPath) {
    await fse.move(ipaFile.filepath, originalIpaAbsPath, { overwrite: true })
  }
  const originalPublicPath = `/uploads/${user.id}/${originalIpaFileName}`
  await storage.saveFileFromPath(originalPublicPath, originalIpaAbsPath)

  // If no version provided, try to extract from IPA's Info.plist
  let ipaMetadata: Awaited<ReturnType<typeof extractVersionInfoFromIpa>> | undefined
  if (!version || !buildNumber) {
    try {
      ipaMetadata = await extractVersionInfoFromIpa(originalIpaAbsPath)
    } catch {
      ipaMetadata = undefined
    }
  }
  if (!version && ipaMetadata?.version) {
    version = ipaMetadata.version
  }
  if (!buildNumber && ipaMetadata?.buildNumber) {
    buildNumber = ipaMetadata.buildNumber
  }

  // If no bundleId provided, try to extract CFBundleIdentifier from IPA
  if (!bundleId) {
    try {
      const fromIpa = await extractBundleIdFromIpa(originalIpaAbsPath)
      if (fromIpa) bundleId = fromIpa
    } catch {}
  }

  let app

  if (appId) {
    // Update existing app (any moderator can update)
    const existing = await prisma.app.findUnique({ where: { id: appId } })
    if (!existing) throw createError({ statusCode: 404, message: 'App not found' })

    // Clean any previous build artifacts for this app id (under the original owner's directory)
    await storage.deletePrefix(`/uploads/${existing.ownerId}/${existing.id}`).catch(() => {})

    // Fill from form or fall back to existing values
    const nextName = nameFromForm || existing.name
    const nextBundleId = bundleId || existing.bundleId
    const nextVersion = version || existing.version || '0.0.0'
    const nextBuildNumber = buildNumber || existing.buildNumber || null

    app = await prisma.app.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        bundleId: nextBundleId,
        version: nextVersion,
        buildNumber: nextBuildNumber,
        // Keep platform fixed to existing app to avoid accidental mismatch
        platform: existing.platform,
        ipaFileName: originalIpaFileName,
        originalIpaPath: originalPublicPath,
        signedIpaPath: null,
        manifestPath: null,
        signedAt: null,
        status: 'SIGNING'
      }
    })
  } else {
    // Replace previous version if same filename for this user+platform exists
    app = await prisma.app.findFirst({ where: { ownerId: user.id, platform: platformFromForm, ipaFileName: originalIpaFileName } })
    if (app) {
      // Clean any previous build artifacts for this app id
      await storage.deletePrefix(`/uploads/${user.id}/${app.id}`).catch(() => {})
      app = await prisma.app.update({
        where: { id: app.id },
        data: {
          name: nameFromForm,
          bundleId,
          version: version || '0.0.0',
          buildNumber: buildNumber || app.buildNumber || null,
          originalIpaPath: originalPublicPath,
          signedIpaPath: null,
          manifestPath: null,
          signedAt: null,
          status: 'SIGNING'
        }
      })
    } else {
      app = await prisma.app.create({
        data: {
          ownerId: user.id,
          platform: platformFromForm,
          name: nameFromForm,
          bundleId,
          version: version || '0.0.0',
          buildNumber: buildNumber || null,
          ipaFileName: originalIpaFileName,
          originalIpaPath: originalPublicPath,
          status: 'SIGNING'
        }
      })
    }
  }

  // Fire-and-forget signing in background (best-effort), reusing stored manager assets
  ;(async () => {
    try {
      const outputDir = await fse.mkdtemp(path.join(process.cwd(), '.storage-tmp', `${app.id}-assets-`))
      try {
        // Expect provisioning and certs
        const profile = Array.isArray(files.profile) ? files.profile[0] : (files.profile as formidable.File)
        const p12 = Array.isArray(files.p12) ? files.p12[0] : (files.p12 as formidable.File)
        const p12Password = (Array.isArray(fields.p12Password) ? fields.p12Password[0] : fields.p12Password) as string | undefined
        let profilePath: string | undefined
        if (profile?.filepath) {
          profilePath = path.join(outputDir, 'profile.mobileprovision')
          await fse.move(profile.filepath, profilePath, { overwrite: true })
        }
        // Convert .p12 to PEM cert and key if provided
        let certPem: string | undefined
        let keyPem: string | undefined
        if (p12?.filepath) {
          const p12Path = path.join(outputDir, 'cert.p12')
          await fse.move(p12.filepath, p12Path, { overwrite: true })
          certPem = path.join(outputDir, 'cert.pem')
          keyPem = path.join(outputDir, 'key.pem')
          // Extract cert
          const passArg = p12Password ? [`-passin`, `pass:${p12Password}`] : []
          await execa('bash', ['-lc', [`openssl`, `pkcs12`, `-in`, p12Path, `-clcerts`, `-nokeys`, `-out`, certPem, ...passArg].map(x => String(x)).join(' ')])
          // Extract key (unencrypted for isign)
          const passArg2 = p12Password ? [`-passin`, `pass:${p12Password}`] : []
          await execa('bash', ['-lc', [`openssl`, `pkcs12`, `-in`, p12Path, `-nocerts`, `-nodes`, `-out`, keyPem, ...passArg2].map(x => String(x)).join(' ')])
        }

        // Persist certificate, key and password to manager profile (remember last uploaded)
        try {
          const updateData: any = {}
          if (certPem && keyPem) {
            const certText = await fse.readFile(certPem, 'utf8')
            const keyText = await fse.readFile(keyPem, 'utf8')
            updateData.certificatePem = JSON.stringify(encrypt(certText))
            updateData.privateKeyPem = JSON.stringify(encrypt(keyText))
          }
          if (typeof p12Password === 'string' && p12Password.length > 0) {
            const enc = encrypt(p12Password)
            updateData.p12PasswordEnc = JSON.stringify(enc)
          }
          if (profilePath) {
            const profileBuf = await fse.readFile(profilePath)
            if (app.platform === 'IOS') updateData.mobileprovisionIos = profileBuf
            else if (app.platform === 'TVOS') updateData.mobileprovisionTvos = profileBuf
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.managerProfile.upsert({
              where: { userId: user.id },
              update: updateData,
              create: {
                userId: user.id,
                displayName: user.nickname,
                ...updateData
              }
            })
          }
        } catch (e) {
          console.error('Failed to persist manager profile assets', e)
        }

        await signApp(app.id)
      } finally {
        await fse.remove(outputDir).catch(() => {})
      }
    } catch (e) {
      await prisma.app.update({ where: { id: app.id }, data: { status: 'FAILED' } })
      console.error('Signing failed', e)
    }
  })()

  return { id: app.id }
})


async function extractVersionInfoFromIpa(ipaPath: string): Promise<{ version?: string; buildNumber?: string } | undefined> {
  const plistData = await readInfoPlistFromIpa(ipaPath)
  if (!plistData || typeof plistData !== 'object') return undefined
  const version = typeof plistData.CFBundleShortVersionString === 'string'
    ? plistData.CFBundleShortVersionString
    : undefined
  const buildNumber = typeof plistData.CFBundleVersion === 'string'
    ? plistData.CFBundleVersion
    : undefined
  if (!version && !buildNumber) return undefined
  return { version, buildNumber }
}

async function extractBundleIdFromIpa(ipaPath: string): Promise<string | undefined> {
  const plistData = await readInfoPlistFromIpa(ipaPath)
  const id = plistData?.CFBundleIdentifier
  return typeof id === 'string' && id.length > 0 ? id : undefined
}

async function readInfoPlistFromIpa(ipaPath: string): Promise<any | undefined> {
  const infoPath = await findInfoPlistPath(ipaPath)
  if (!infoPath) return undefined

  const { stdout: b64 } = await execa('bash', ['-lc', `unzip -p ${shellQuote(ipaPath)} ${shellQuote(infoPath)} | base64`])
  const buf = Buffer.from(b64, 'base64')

  const head = buf.subarray(0, 8).toString('utf8')
  if (head.startsWith('bplist')) {
    return parseBinaryPlist(buf)
  }
  try {
    return plist.parse(buf.toString('utf8'))
  } catch {
    return undefined
  }
}

async function findInfoPlistPath(ipaPath: string): Promise<string | undefined> {
  const commands = [
    `unzip -Z1 ${shellQuote(ipaPath)} | grep -E '^Payload/[^/]+\\.app/Info\\.plist$' | head -n1`,
    `zipinfo -1 ${shellQuote(ipaPath)} | grep -E '^Payload/[^/]+\\.app/Info\\.plist$' | head -n1`
  ]

  for (const cmd of commands) {
    try {
      const { stdout } = await execa('bash', ['-lc', cmd])
      const trimmed = stdout.trim()
      if (trimmed) return trimmed
    } catch {
      // continue
    }
  }
  return undefined
}

async function parseBinaryPlist(buf: Buffer): Promise<any> {
  // Prefer local bplist-parser. If unavailable, fall back to plutil.
  try {
    const require = createRequire(import.meta.url)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bplist = require('bplist-parser') as { parseBuffer: (b: Buffer) => any[] }
    const arr = bplist.parseBuffer(buf)
    return Array.isArray(arr) ? arr[0] : arr
  } catch {
    // macOS fallback using plutil
    try {
      const { stdout } = await execa('plutil', ['-convert', 'xml1', '-o', '-', '-'], { input: buf })
      return plist.parse(stdout)
    } catch (e) {
      console.error('Failed to parse binary plist', e)
      return undefined
    }
  }
}

function shellQuote(p: string): string {
  return `'${p.replace(/'/g, `'\''`)}'`
}


