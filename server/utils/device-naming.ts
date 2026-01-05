/**
 * Utility functions for unified device naming across all users
 * Format: [Discord name] - [Device type] [number]
 * Example: "john_doe - iPhone 1", "john_doe - Mac 2"
 */

/**
 * Map Apple deviceClass to our platform enum
 */
export function deviceClassToPlatform(deviceClass: string): 'IOS' | 'MAC_OS' | 'APPLE_TV' {
  const normalizedClass = deviceClass.toUpperCase()
  
  switch (normalizedClass) {
    case 'MAC':
    case 'MACBOOK':
      return 'MAC_OS'
    case 'APPLE_TV':
    case 'TV':
      return 'APPLE_TV'
    case 'IPHONE':
    case 'IPAD':
    case 'IPOD':
    case 'APPLE_WATCH':
    default:
      return 'IOS'
  }
}

/**
 * Get a user-friendly device type name from platform
 */
export function getDeviceTypeName(platform: string): string {
  switch (platform) {
    case 'IOS':
      return 'iPhone'
    case 'MAC_OS':
      return 'Mac'
    case 'APPLE_TV':
      return 'Apple TV'
    default:
      return 'Device'
  }
}

/**
 * Get a more specific device type name from Apple deviceClass
 */
export function getDeviceTypeNameFromClass(deviceClass: string): string {
  const normalizedClass = deviceClass.toUpperCase()
  
  switch (normalizedClass) {
    case 'IPHONE':
      return 'iPhone'
    case 'IPAD':
      return 'iPad'
    case 'MAC':
    case 'MACBOOK':
      return 'Mac'
    case 'APPLE_TV':
    case 'TV':
      return 'Apple TV'
    case 'APPLE_WATCH':
      return 'Apple Watch'
    case 'IPOD':
      return 'iPod'
    default:
      return 'Device'
  }
}

/**
 * Generate a device name using the unified format
 * @param discordName - The user's Discord name
 * @param platform - Device platform (IOS, MAC_OS, APPLE_TV)
 * @param deviceNumber - Sequential number for this user's device
 * @param deviceClass - Optional Apple deviceClass for more specific naming
 * @returns Formatted device name
 */
export function generateDeviceName(
  discordName: string,
  platform: string,
  deviceNumber: number,
  deviceClass?: string
): string {
  const deviceType = deviceClass 
    ? getDeviceTypeNameFromClass(deviceClass)
    : getDeviceTypeName(platform)
  return `${discordName} - ${deviceType} ${deviceNumber}`
}

/**
 * Parse a device name to extract Discord name, device type, and number
 * Returns null if the name doesn't match the expected format
 */
export function parseDeviceName(deviceName: string): {
  discordName: string
  deviceType: string
  deviceNumber: number
} | null {
  // Match pattern: "Discord Name - Device Type Number"
  const match = deviceName.match(/^(.+?)\s*-\s*(.+?)\s+(\d+)$/)
  if (!match) return null

  const [, discordName, deviceType, numberStr] = match
  return {
    discordName: discordName.trim(),
    deviceType: deviceType.trim(),
    deviceNumber: parseInt(numberStr, 10)
  }
}

/**
 * Get the next available device number for a user per platform
 * @param userId - The registered user ID
 * @param platform - The device platform (IOS, MAC_OS, APPLE_TV)
 * @param prisma - Prisma client instance
 * @returns The next device number to use for this platform
 */
export async function getNextDeviceNumber(
  userId: string,
  platform: string,
  prisma: any
): Promise<number> {
  const maxDevice = await prisma.userDevice.findFirst({
    where: { 
      registeredUserId: userId,
      platform: platform
    },
    orderBy: { deviceNumber: 'desc' },
    select: { deviceNumber: true }
  })

  return maxDevice ? maxDevice.deviceNumber + 1 : 1
}
