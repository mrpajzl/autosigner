export default defineNuxtRouteMiddleware(async (to) => {
  // Only check auth on protected routes
  const protectedRoutes = ['/admin', '/profile', '/apps', '/my-registrations']
  const isProtected = protectedRoutes.some(route => 
    to.path === route || to.path.startsWith(route + '/')
  )
  
  if (!isProtected) return
  
  // Get auth state
  const { user, asyncData } = useAuth()
  
  // Wait for auth data to load
  if (asyncData.status.value === 'pending') {
    await asyncData
  }
  
  // Redirect to login if not authenticated
  if (!user.value) {
    return navigateTo('/auth/login')
  }
  
  // Check admin routes - require MANAGER or SUPERADMIN
  if (to.path.startsWith('/admin')) {
    const role = user.value.role
    if (role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return navigateTo('/')
    }
  }
})

