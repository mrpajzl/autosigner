/**
 * Update all device names to reflect per-platform numbering
 * After the migration, device numbers are now per platform, so we need to regenerate names
 */

import { PrismaClient } from '@prisma/client'
import { generateDeviceName } from '../server/utils/device-naming'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating device names with per-platform numbering...\n')

  // Fetch all users with their devices
  const users = await prisma.registeredUser.findMany({
    include: {
      devices: {
        orderBy: [
          { platform: 'asc' },
          { deviceNumber: 'asc' }
        ]
      }
    }
  })

  let totalUpdated = 0

  for (const user of users) {
    if (user.devices.length === 0) continue
    
    console.log(`\n👤 Processing user: ${user.discordName} (${user.devices.length} devices)`)

    // Group devices by platform to show numbering
    const devicesByPlatform = new Map<string, number>()
    
    for (const device of user.devices) {
      const count = (devicesByPlatform.get(device.platform) || 0) + 1
      devicesByPlatform.set(device.platform, count)
      
      // Generate new name with per-platform numbering
      const newName = generateDeviceName(
        user.discordName,
        device.platform,
        device.deviceNumber
      )

      if (device.name !== newName) {
        console.log(`  ✏️  ${device.platform} #${device.deviceNumber}: "${device.name}" → "${newName}"`)

        await prisma.userDevice.update({
          where: { id: device.id },
          data: { name: newName }
        })

        totalUpdated++
      } else {
        console.log(`  ✓  ${device.platform} #${device.deviceNumber}: "${device.name}"`)
      }
    }
    
    // Show summary for this user
    const summary = Array.from(devicesByPlatform.entries())
      .map(([platform, count]) => `${platform}: ${count}`)
      .join(', ')
    console.log(`  📊 Summary: ${summary}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Update complete!')
  console.log(`   Updated: ${totalUpdated} device names`)
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Update failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
