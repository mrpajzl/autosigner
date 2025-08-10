import { getSessionUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const url = event.path

  // Always public
  if (
    url === '/' ||
    url.startsWith('/_nuxt/') ||
    url.startsWith('/__nuxt_content/') ||
    url.startsWith('/public/') ||
    url.startsWith('/uploads/') ||
    url.startsWith('/auth/') ||
    url.startsWith('/api/auth/') ||
    url.startsWith('/api/bootstrap.superadmin') ||
    url.startsWith('/api/manifest/')
  ) {
    return
  }

  // Only protect app/account areas and their APIs
  const protectedPrefixes = [
    '/apps',
    '/upload',
    '/admin',
    '/api/apps',
    '/api/stats'
  ]
  const isProtected = protectedPrefixes.some((p) => url === p || url.startsWith(p + '/'))
  if (!isProtected) return

  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
})


