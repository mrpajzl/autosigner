import { requireAnyRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'

/**
 * POST /api/admin/apps/:id/update
 * Update app details (name, etc.)
 */
export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const appId = getRouterParam(event, 'id')
  
  if (!appId) {
    throw createError({ statusCode: 400, message: 'App ID required' })
  }
  
  const body = await readBody<{ name?: string }>(event)
  
  // Check if app exists
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) {
    throw createError({ statusCode: 404, message: 'App not found' })
  }
  
  // Only owner or SUPERADMIN can update app details
  if (app.ownerId !== user.id && user.role !== 'SUPERADMIN') {
    throw createError({ statusCode: 403, message: 'Not authorized to update this app' })
  }
  
  // Build update data
  const updateData: { name?: string } = {}
  
  if (body.name && typeof body.name === 'string') {
    const trimmedName = body.name.trim()
    if (trimmedName.length === 0) {
      throw createError({ statusCode: 400, message: 'App name cannot be empty' })
    }
    if (trimmedName.length > 100) {
      throw createError({ statusCode: 400, message: 'App name is too long (max 100 characters)' })
    }
    updateData.name = trimmedName
  }
  
  if (Object.keys(updateData).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }
  
  const updated = await prisma.app.update({
    where: { id: appId },
    data: updateData
  })
  
  return { success: true, app: { id: updated.id, name: updated.name } }
})

