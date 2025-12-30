import { prisma } from '../../../utils/db'
import { nanoid } from 'nanoid'
import { linkDiscordUser } from '../../../utils/discord-linking'

interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  
  const code = query.code as string
  const state = query.state as string
  
  // Verify state for CSRF protection
  const storedState = getCookie(event, 'discord_oauth_state')
  deleteCookie(event, 'discord_oauth_state', { path: '/' })
  
  if (!code || !state || state !== storedState) {
    throw createError({ statusCode: 400, message: 'Invalid OAuth state' })
  }
  
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 500, message: 'Discord OAuth not configured' })
  }
  
  const redirectUri = `${config.public.baseUrl}/api/auth/discord/callback`
  
  try {
    // Exchange code for access token
    const tokenResponse = await $fetch<DiscordTokenResponse>('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    })
    
    // Get user info from Discord
    const discordUser = await $fetch<DiscordUser>('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`
      }
    })
    
    // Create username format (Discord removed discriminators for most users, but keep compatibility)
    const discordUsername = discordUser.discriminator !== '0' 
      ? `${discordUser.username}#${discordUser.discriminator}`
      : discordUser.username
    
    // Build avatar URL if avatar exists
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { discordId: discordUser.id }
    })
    
    if (!user) {
      // Create new user with Discord auth
      // Use Discord username as nickname, but ensure uniqueness
      let nickname = discordUser.username
      let counter = 1
      while (await prisma.user.findUnique({ where: { nickname } })) {
        nickname = `${discordUser.username}_${counter}`
        counter++
      }
      
      user = await prisma.user.create({
        data: {
          nickname,
          authProvider: 'discord',
          discordId: discordUser.id,
          discordUsername,
          discordAvatar: avatarUrl,
          role: 'USER', // Discord users get USER role by default
          status: 'APPROVED'
        }
      })
      
      // Link with any existing RegisteredUser entries that match this Discord ID
      await linkDiscordUser(user.id, discordUser.id, discordUsername, user.nickname)
    } else {
      // Update existing user's Discord info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          discordUsername,
          discordAvatar: avatarUrl
        }
      })
      
      // Always try to link with any existing RegisteredUser entries
      // This ensures we catch new matches on every sign-in, especially if no connection exists
      await linkDiscordUser(user.id, discordUser.id, discordUsername, user.nickname)
    }
    
    // Create session
    const token = nanoid(40)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })
    
    // Set session cookie
    const isProd = process.env.NODE_ENV === 'production'
    setCookie(event, 'as_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    })
    
    // Redirect to home or user dashboard
    return sendRedirect(event, '/my-registrations')
  } catch (error: any) {
    console.error('Discord OAuth error:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Failed to authenticate with Discord: ' + (error.message || 'Unknown error')
    })
  }
})


