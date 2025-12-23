// Initiates Discord OAuth flow
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    throw createError({ statusCode: 500, message: 'Discord OAuth not configured' })
  }

  const redirectUri = `${config.public.baseUrl}/api/auth/discord/callback`
  const scope = 'identify email'
  
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Store state in cookie for verification in callback
  // Use less strict settings in development to handle OAuth redirects
  const isProd = process.env.NODE_ENV === 'production'
  setCookie(event, 'discord_oauth_state', state, {
    httpOnly: true,
    secure: false, // Allow HTTP in development
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  })

  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`
  
  return sendRedirect(event, authUrl)
})

