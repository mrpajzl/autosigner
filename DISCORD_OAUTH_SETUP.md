# Discord OAuth Setup Guide

## Overview

Discord OAuth has been successfully integrated into FastSigner! This allows end users to sign in with their Discord accounts and automatically see their device registrations from all moderators they're registered with.

## Features Implemented

### 1. **Discord Sign-In for End Users**
- Users can sign in using their Discord account
- No need to remember another password
- Automatic account creation on first login

### 2. **Automatic Registration Linking**
- When a Discord user signs in, the system automatically finds and links their `RegisteredUser` entries
- Links based on Discord ID or Discord username
- Works across multiple moderators

### 3. **User Dashboard (`/my-registrations`)**
- Shows all moderators the user is registered with
- Displays devices, UDIDs, and paid status for each moderator
- Clean, organized view grouped by moderator
- Shows payment status and device counts

### 4. **Moderator Discord ID Management**
- Moderators can now set Discord IDs when creating/editing registered users
- Enables automatic linking when those users sign in with Discord

## Setup Instructions

### Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give it a name (e.g., "FastSigner")
4. Navigate to OAuth2 section
5. Copy your **Client ID** and **Client Secret**

### Step 2: Configure Redirect URLs

In the Discord Developer Portal, under OAuth2 → Redirects, add:

**For Development:**
```
http://localhost:3000/api/auth/discord/callback
```

**For Production:**
```
https://yourdomain.com/api/auth/discord/callback
```

### Step 3: Add Environment Variables

Add these to your `.env` file:

```bash
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Make sure PUBLIC_BASE_URL is set correctly for OAuth redirects
PUBLIC_BASE_URL=http://localhost:3000  # or your production URL
```

### Step 4: Database Migration

The database schema has already been updated with:
```bash
npm run db:push
```

If you need to regenerate Prisma client:
```bash
npx prisma generate
```

## How It Works

### For End Users:

1. **Sign In**: Visit `/auth/login` and click "Sign in with Discord"
2. **Authorize**: Approve the Discord OAuth request
3. **View Dashboard**: Get redirected to `/my-registrations`
4. **See Everything**: View all your registrations across all moderators

### For Moderators:

1. **Add Discord IDs**: When creating/editing users in `/profile/user-database`, you can now optionally add their Discord ID
2. **Automatic Linking**: When that user signs in with Discord, their account will be automatically linked
3. **No Changes Required**: Your existing workflow remains the same - Discord ID is optional

## Database Schema Changes

### User Model
```prisma
model User {
  // New fields for Discord OAuth:
  authProvider    String  @default("local") // "local" or "discord"
  discordId       String? @unique
  discordUsername String?
  discordAvatar   String?
  passwordHash    String? // Now optional for Discord users
}
```

### RegisteredUser Model
```prisma
model RegisteredUser {
  // New fields for linking:
  discordId       String?  // Discord ID for automatic linking
  linkedUserId    String?  // Link to actual User account
  linkedUser      User?    @relation("DiscordUserLink")
}
```

## API Endpoints

### Authentication
- `GET /api/auth/discord` - Initiates Discord OAuth flow
- `GET /api/auth/discord/callback` - Handles OAuth callback

### User Dashboard
- `GET /api/my-registrations` - Fetches all registrations for logged-in Discord user

## User Experience Flow

```
Discord User Flow:
1. Click "Sign in with Discord" → Discord authorization
2. First time: Account created automatically
3. System finds all RegisteredUser entries matching their Discord ID/username
4. Links them to the user account
5. Redirects to /my-registrations dashboard
6. User sees all their registrations grouped by moderator

Moderator Flow (unchanged):
1. Manage users in /profile/user-database
2. Optionally add Discord IDs for automatic linking
3. Users can still be added/managed without Discord IDs
```

## Security Features

- **CSRF Protection**: State parameter validation
- **Secure Sessions**: HttpOnly cookies
- **Password Protection**: Discord users cannot use password login
- **OAuth Scopes**: Only requests `identify` and `email` scopes

## Testing

### Test as an End User:
1. Make sure you have a RegisteredUser entry (ask a moderator)
2. Have the moderator set your Discord ID in your registration
3. Visit `/auth/login`
4. Click "Sign in with Discord"
5. Authorize the app
6. You should see your registrations at `/my-registrations`

### Test as a Moderator:
1. Go to `/profile/user-database`
2. Create or edit a user
3. Add their Discord ID (you can get this from Discord Developer Mode)
4. When that user signs in with Discord, they'll be automatically linked

## Troubleshooting

### "Discord OAuth not configured" Error
- Make sure `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are set in `.env`
- Restart your dev server after adding env variables

### "Invalid OAuth state" Error
- This is usually caused by browser cookie issues
- Clear cookies and try again
- Make sure cookies are enabled

### User Not Seeing Their Registrations
- Verify the Discord ID in the RegisteredUser entry matches their actual Discord ID
- Check if the Discord username matches (case-sensitive)
- The linking happens automatically on first Discord login

### Redirect URI Mismatch
- Make sure the redirect URI in Discord Developer Portal exactly matches your callback URL
- Check that `PUBLIC_BASE_URL` in `.env` is correct
- No trailing slashes

## Migration from Existing System

Existing users and moderators are **not affected**:
- Traditional login (nickname/password) still works
- Moderators continue using traditional login
- Discord OAuth is an **additional** authentication method
- No data loss or breaking changes

## Development vs Production

### Development (localhost):
```bash
PUBLIC_BASE_URL=http://localhost:3000
DISCORD_CLIENT_ID=dev_client_id
DISCORD_CLIENT_SECRET=dev_secret
```

### Production:
```bash
PUBLIC_BASE_URL=https://yourdomain.com
DISCORD_CLIENT_ID=prod_client_id
DISCORD_CLIENT_SECRET=prod_secret
```

**Note**: You may want separate Discord applications for dev and production.

## Next Steps

After setting up Discord OAuth, consider:

1. **Welcome Message**: Add Discord integration announcement to your community
2. **User Onboarding**: Create a guide for users explaining how to sign in with Discord
3. **Discord Bot**: Consider adding a Discord bot to automate user registration
4. **Rich Presence**: Add Discord Rich Presence for app installations

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Discord Developer Portal settings match your configuration
4. Test with a fresh browser/incognito window

---

**Implementation Complete!** 🎉

All TODOs have been completed:
- ✅ Database schema updated
- ✅ OAuth dependencies installed
- ✅ Discord OAuth endpoints created
- ✅ RegisteredUser model updated for linking
- ✅ Auth utilities updated
- ✅ Login page UI with Discord button
- ✅ User dashboard created
- ✅ Database migration applied


