export default defineNuxtRouteMiddleware(async (to) => {
  // Only check auth on protected routes
  const protectedRoutes = ['/admin', '/profile', '/apps']
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
  
  // Check admin routes - some require specific roles
  if (to.path.startsWith('/admin')) {
    const role = user.value.role
    
    // /admin/approvals requires SUPERADMIN only
    if (to.path === '/admin/approvals' || to.path.startsWith('/admin/approvals/')) {
      if (role !== 'SUPERADMIN') {
        return navigateTo('/')
      }
    }
    // Other admin routes require MANAGER or SUPERADMIN
    else if (role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return navigateTo('/')
    }
  }
})

