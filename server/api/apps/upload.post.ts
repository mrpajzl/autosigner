import { requireUser } from '../../utils/auth'
import formidable from 'formidable'
import fse from 'fs-extra'
import { prisma } from '../../utils/db'
import { execa } from 'execa'
import path from 'node:path'
import plist from 'plist'
import { encrypt } from '../../utils/crypto'
import { createRequire } from 'node:module'

export const config = { api: { bodyParser: false } }

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', user.id)
  await fse.ensureDir(uploadDir)

  const form = formidable({ multiples: true, uploadDir, keepExtensions: true })
  const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(event.node.req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })))
  })

  const getField = (key: keyof typeof fields): string | undefined => {
    const v = fields[key]
    if (Array.isArray(v)) return v[0] ? String(v[0]) : undefined
    if (v === undefined || v === null) return undefined
    const s = String(v).trim()
    return s.length ? s : undefined
  }

  const name = getField('name') || 'Unnamed App'
  const bundleId = getField('bundleId') || ''
  let version = getField('version')
  const platform = (getField('platform') || 'IOS').toUpperCase()
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

  // If no version provided, try to extract from IPA's Info.plist
  if (!version) {
    try {
      version = await extractVersionFromIpa(originalIpaAbsPath)
    } catch {
      // ignore; will stay undefined and fail later if required downstream
    }
  }

  // Replace previous version if same filename for this user+platform exists
  let app = await prisma.app.findFirst({ where: { ownerId: user.id, platform, ipaFileName: originalIpaFileName } })
  if (app) {
    // Clean any previous build artifacts for this app id
    const existingOutputDir = path.join(uploadDir, app.id)
    await fse.remove(existingOutputDir).catch(() => {})
    app = await prisma.app.update({
      where: { id: app.id },
      data: {
        name,
        bundleId,
        version: version || '0.0.0',
        originalIpaPath: `/uploads/${user.id}/${originalIpaFileName}`,
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
        platform,
        name,
        bundleId,
        version: version || '0.0.0',
        ipaFileName: originalIpaFileName,
        originalIpaPath: `/uploads/${user.id}/${originalIpaFileName}`,
        status: 'SIGNING'
      }
    })
  }

  // Fire-and-forget signing in background (best-effort)
  ;(async () => {
    try {
      const outputDir = path.join(uploadDir, app.id)
      await fse.ensureDir(outputDir)

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
          if (platform === 'IOS') updateData.mobileprovisionIos = profileBuf
          else if (platform === 'TVOS') updateData.mobileprovisionTvos = profileBuf
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.managerProfile.upsert({
            where: { userId: user.id },
            update: updateData,
            create: {
              userId: user.id,
              displayName: user.email,
              ...updateData
            }
          })
        }
      } catch (e) {
        console.error('Failed to persist manager profile assets', e)
      }

      // Try using isign if available; otherwise, mark failed with note.
      let signedIpaPublic: string | undefined
      try {
        await execa('bash', ['-lc', `command -v isign`])
        const signedPath = path.join(outputDir, `${app.id}-signed.ipa`)
        // Let isign infer identifier from original IPA unless user provided one
        const certArg = certPem
        const keyArg = keyPem
          const args = [
          'isign',
          ...(bundleId ? ['-i', bundleId] : []),
          ...(profilePath ? ['-p', profilePath] : []),
          ...(certArg ? ['-c', certArg] : []),
          ...(keyArg ? ['-k', keyArg] : []),
          '-o', signedPath,
          // Use the absolute path of the uploaded IPA we just saved
          originalIpaAbsPath
        ]
        await execa('bash', ['-lc', args.map((a) => `'${a}'`).join(' ')])
        signedIpaPublic = `/uploads/${user.id}/${app.id}/${path.basename(signedPath)}`
      } catch {
        // Fallback: assume original IPA (not signed)
        signedIpaPublic = app.originalIpaPath
      }

      // Generate manifest only for iOS; tvOS uses direct download
      let manifestPublic: string | undefined
      if (platform === 'IOS') {
        const baseUrl = useRuntimeConfig().public.baseUrl || getRequestURL(event).origin
        const manifest = {
          items: [
            {
              assets: [
                { kind: 'software-package', url: `${baseUrl}${signedIpaPublic}` }
              ],
              metadata: {
                'bundle-identifier': bundleId,
                'bundle-version': version || '0.0.0',
                kind: 'software',
                title: name
              }
            }
          ]
        }
        const plistXml = plist.build(manifest as any)
        const manifestPath = path.join(outputDir, 'manifest.plist')
        await fse.writeFile(manifestPath, plistXml)
        manifestPublic = `/uploads/${user.id}/${app.id}/manifest.plist`
      }

      await prisma.app.update({
        where: { id: app.id },
        data: { status: 'SIGNED', signedAt: new Date(), signedIpaPath: signedIpaPublic, manifestPath: manifestPublic }
      })
    } catch (e) {
      await prisma.app.update({ where: { id: app.id }, data: { status: 'FAILED' } })
      console.error('Signing failed', e)
    }
  })()

  return { id: app.id }
})


async function extractVersionFromIpa(ipaPath: string): Promise<string | undefined> {
  // Try to locate Info.plist path inside the IPA
  const infoPath = await (async () => {
    try {
      const { stdout } = await execa('bash', ['-lc', `unzip -Z1 ${shellQuote(ipaPath)} | grep -E '^Payload/[^/]+\\.app/Info\\.plist$' | head -n1`])
      return stdout.trim() || undefined
    } catch {
      try {
        const { stdout } = await execa('bash', ['-lc', `zipinfo -1 ${shellQuote(ipaPath)} | grep -E '^Payload/[^/]+\\.app/Info\\.plist$' | head -n1`])
        return stdout.trim() || undefined
      } catch {
        return undefined
      }
    }
  })()
  if (!infoPath) return undefined

  // Extract Info.plist bytes (base64 to preserve binary)
  const { stdout: b64 } = await execa('bash', ['-lc', `unzip -p ${shellQuote(ipaPath)} ${shellQuote(infoPath)} | base64`])
  const buf = Buffer.from(b64, 'base64')

  // Parse plist (handle XML or binary)
  const head = buf.subarray(0, 8).toString('utf8')
  let parsed: any
  if (head.startsWith('bplist')) {
    parsed = await parseBinaryPlist(buf)
  } else {
    parsed = plist.parse(buf.toString('utf8'))
  }

  const v = parsed?.CFBundleShortVersionString || parsed?.CFBundleVersion
  return typeof v === 'string' ? v : undefined
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


