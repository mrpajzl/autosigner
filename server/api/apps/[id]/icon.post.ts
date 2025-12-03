import { requireAnyRole } from '../../../utils/auth'
// @ts-ignore - formidable types provided via local shim
import formidable from 'formidable'
// @ts-ignore - fs-extra types provided via local shim
import fse from 'fs-extra'
import { prisma } from '../../../utils/db'
import { storage } from '../../../utils/storage'

export const config = { api: { bodyParser: false } }

/**
 * POST /api/apps/:id/icon
 * Upload/update an app's icon
 */
export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const appId = getRouterParam(event, 'id')
  
  if (!appId) {
    throw createError({ statusCode: 400, message: 'App ID required' })
  }
  
  // Check if app exists
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }
  
  // Only owner or SUPERADMIN can update icon
  if (app.ownerId !== user.id && user.role !== 'SUPERADMIN') {
    throw createError({ statusCode: 403, message: 'Not authorized to update this app' })
  }
  
  const form = formidable({ multiples: false })
  const { files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(event.node.req, (err: any, fields: any, files: any) => (err ? reject(err) : resolve({ fields, files })))
  })
  
  const iconFile = Array.isArray(files.icon) ? files.icon[0] : (files.icon as formidable.File)
  if (!iconFile?.filepath) {
    throw createError({ statusCode: 400, message: 'Icon file required' })
  }
  
  try {
    const iconBuffer = await fse.readFile(iconFile.filepath)
    if (!iconBuffer || iconBuffer.length === 0) {
      throw createError({ statusCode: 400, message: 'Icon file is empty' })
    }
    
    // Determine file extension from original filename or default to png
    const ext = iconFile.originalFilename?.split('.').pop()?.toLowerCase() || 'png'
    const iconFileName = `icon-${Date.now()}.${ext}`
    const iconPath = `/uploads/${app.ownerId}/icons/${iconFileName}`
    const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
    
    await storage.saveBuffer(iconPath, iconBuffer, contentType)
    
    // Update the app with the new icon path
    await prisma.app.update({
      where: { id: appId },
      data: { iconPath }
    })
    
    // Cleanup temp file
    await fse.remove(iconFile.filepath).catch(() => {})
    
    return { success: true, iconPath }
  } catch (e: any) {
    // Cleanup temp file on error
    await fse.remove(iconFile.filepath).catch(() => {})
    throw createError({ statusCode: 500, message: e?.message || 'Failed to update icon' })
  }
})


