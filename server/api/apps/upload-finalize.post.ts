import { requireAnyRole } from '../../utils/auth'
// @ts-ignore - fs-extra types provided via local shim
import fse from 'fs-extra'
import { prisma } from '../../utils/db'
import { execa } from 'execa'
import path from 'node:path'
// @ts-ignore - plist types provided via local shim
import plist from 'plist'
import { signingQueue } from '../../utils/signing-queue'
import { storage } from '../../utils/storage'
import { createRequire } from 'node:module'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  
  const body = await readBody(event)
  const { uploadId, fileName, name, platform, appId } = body

  if (!uploadId || !fileName) {
    throw createError({ statusCode: 400, message: 'uploadId and fileName are required' })
  }

  // Find the assembled file
  const sessionDir = path.join(process.cwd(), '.storage-tmp', 'chunks', uploadId)
  const assembledPath = path.join(sessionDir, fileName)

  if (!await fse.pathExists(assembledPath)) {
    throw createError({ statusCode: 404, message: 'Assembled file not found. Upload may have expired.' })
  }

  // Move to incoming directory for processing
  const uploadDir = path.join(process.cwd(), '.storage-tmp', 'incoming', user.id)
  await fse.ensureDir(uploadDir)
  
  const originalIpaFileName = path.basename(fileName)
  const originalIpaAbsPath = path.join(uploadDir, originalIpaFileName)
  await fse.move(assembledPath, originalIpaAbsPath, { overwrite: true })
  
  // Clean up session directory
  await fse.remove(sessionDir).catch(() => {})

  const originalPublicPath = `/uploads/${user.id}/${originalIpaFileName}`
  await storage.saveFileFromPath(originalPublicPath, originalIpaAbsPath)

  // Extract version info from IPA
  let version: string | undefined
  let buildNumber: string | undefined
  let bundleId = ''
  
  try {
    console.log(`[IPA Metadata] Extracting version info from: ${originalIpaAbsPath}`)
    const ipaMetadata = await extractVersionInfoFromIpa(originalIpaAbsPath)
    console.log(`[IPA Metadata] Extracted version info:`, ipaMetadata)
    version = ipaMetadata?.version
    buildNumber = ipaMetadata?.buildNumber
  } catch (e) {
    console.error(`[IPA Metadata] Failed to extract version info:`, e)
  }

  // Extract bundle ID
  try {
    console.log(`[IPA Metadata] Extracting bundle ID from: ${originalIpaAbsPath}`)
    const fromIpa = await extractBundleIdFromIpa(originalIpaAbsPath)
    console.log(`[IPA Metadata] Extracted bundle ID: ${fromIpa}`)
    if (fromIpa) bundleId = fromIpa
  } catch (e) {
    console.error(`[IPA Metadata] Failed to extract bundle ID:`, e)
  }

  const nameFromForm = name || 'Unnamed App'
  const platformFromForm = (platform || 'IOS').toUpperCase()

  let app

  if (appId) {
    // Update existing app
    const existing = await prisma.app.findUnique({ where: { id: appId } })
    if (!existing) throw createError({ statusCode: 404, message: 'App not found' })

    await storage.deletePrefix(`/uploads/${existing.ownerId}/${existing.id}`).catch(() => {})

    app = await prisma.app.update({
      where: { id: existing.id },
      data: {
        name: nameFromForm || existing.name,
        bundleId: bundleId || existing.bundleId,
        version: version || existing.version || '0.0.0',
        buildNumber: buildNumber || existing.buildNumber || null,
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
    // Create or replace app
    app = await prisma.app.findFirst({ 
      where: { ownerId: user.id, platform: platformFromForm, ipaFileName: originalIpaFileName } 
    })
    
    if (app) {
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
          status: 'SIGNING',
          iconPath: null
        }
      })
    }
  }

  // Queue signing job
  await signingQueue.enqueueOwnerSigning(app.id, user.id)

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
  try {
    const require = createRequire(import.meta.url)
    const bplist = require('bplist-parser') as { parseBuffer: (b: Buffer) => any[] }
    const arr = bplist.parseBuffer(buf)
    return Array.isArray(arr) ? arr[0] : arr
  } catch {
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





