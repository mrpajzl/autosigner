import { prisma } from './db'

/**
 * Links a Discord-authenticated User with matching RegisteredUser entries.
 * Tries matching by:
 * - Discord ID (exact match)
 * - Discord username (exact match, with and without discriminator)
 * - User nickname (case-insensitive)
 * 
 * Only links entries that aren't already linked to a different user.
 */
export async function linkDiscordUser(
  userId: string,
  discordId: string | null,
  discordUsername: string | null,
  userNickname: string
): Promise<number> {
  if (!discordId && !discordUsername && !userNickname) {
    return 0
  }

  // Build OR conditions for matching
  const matchConditions: any[] = []
  
  if (discordId) {
    matchConditions.push({ discordId: discordId })
  }
  
  if (discordUsername) {
    matchConditions.push({ discordName: discordUsername })
    // Also try without discriminator
    matchConditions.push({ discordName: discordUsername.split('#')[0] })
  }
  
  // Try matching by User's nickname (case-insensitive)
  if (userNickname) {
    matchConditions.push({ discordName: { equals: userNickname, mode: 'insensitive' } })
  }
  
  if (matchConditions.length === 0) {
    return 0
  }
  
  // Find all RegisteredUser entries that match this Discord ID, username, or nickname
  // Only match entries that aren't already linked to a different user
  const matchingEntries = await prisma.registeredUser.findMany({
    where: {
      AND: [
        {
          OR: matchConditions
        },
        {
          OR: [
            { linkedUserId: null },
            { linkedUserId: userId }
          ]
        }
      ]
    }
  })
  
  // Link them all to this user
  let linkedCount = 0
  for (const entry of matchingEntries) {
    await prisma.registeredUser.update({
      where: { id: entry.id },
      data: {
        linkedUserId: userId,
        discordId: discordId ?? entry.discordId
      }
    })
    linkedCount++
  }
  
  return linkedCount
}

/**
 * Attempts to auto-link all Discord users with RegisteredUser entries.
 * Returns the number of new links created.
 */
export async function autoLinkAllDiscordUsers(): Promise<number> {
  const discordUsers = await prisma.user.findMany({
    where: {
      authProvider: 'discord'
    },
    select: {
      id: true,
      discordId: true,
      discordUsername: true,
      nickname: true
    }
  })
  
  let totalLinked = 0
  for (const user of discordUsers) {
    const linked = await linkDiscordUser(
      user.id,
      user.discordId,
      user.discordUsername,
      user.nickname
    )
    totalLinked += linked
  }
  
  return totalLinked
}
