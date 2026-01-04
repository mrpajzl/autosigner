/**
 * Migration script to update existing device names to the new unified format
 * Run this once to convert all existing device names to: [Discord name] - [Device type] [number]
 */

import { PrismaClient } from '@prisma/client'
import { generateDeviceName } from '../server/utils/device-naming'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting device name migration...\n')

  // Fetch all registered users with their devices
  const users = await prisma.registeredUser.findMany({
    include: {
      devices: {
        orderBy: { deviceNumber: 'asc' }
      }
    }
  })

  let totalUpdated = 0
  let totalSkipped = 0

  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.discordName} (${user.devices.length} devices)`)

    for (const device of user.devices) {
      // Generate the new unified name
      const newName = generateDeviceName(
        user.discordName,
        device.platform,
        device.deviceNumber
      )

      // Check if name needs updating
      if (device.name !== newName) {
        console.log(`  ✏️  Updating: "${device.name}" → "${newName}"`)

        await prisma.userDevice.update({
          where: { id: device.id },
          data: { name: newName }
        })

        totalUpdated++
      } else {
        console.log(`  ✓  Already correct: "${device.name}"`)
        totalSkipped++
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Migration complete!')
  console.log(`   Updated: ${totalUpdated} devices`)
  console.log(`   Skipped: ${totalSkipped} devices (already correct)`)
  console.log(`   Total:   ${totalUpdated + totalSkipped} devices`)
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
