/**
 * Migration script to update all device platforms from Apple Developer Portal
 * This will detect the correct device type (iPhone, iPad, Mac, Apple TV, etc.) from Apple's API
 * and update the local database accordingly
 */

import { PrismaClient } from '@prisma/client'
import { AppleDeveloperAPI } from '../server/utils/apple-api'
import { deviceClassToPlatform, generateDeviceName } from '../server/utils/device-naming'
import { decrypt } from '../server/utils/crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting device platform update from Apple...\n')

  // Get Apple credentials from database for the first user who has them
  const credentials = await prisma.appleDeveloperCredentials.findFirst()

  if (!credentials) {
    console.error('❌ Error: No Apple Developer credentials found in database')
    console.error('   Please configure your Apple Developer credentials first')
    process.exit(1)
  }

  console.log(`✓ Using credentials for user: ${credentials.userId}`)

  // Decrypt the private key
  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()

  // Initialize Apple API
  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  try {
    // Fetch all devices from Apple
    console.log('📡 Fetching devices from Apple Developer Portal...')
    const appleDevices = await api.listDevices()
    console.log(`✓ Found ${appleDevices.length} devices in Apple Developer Portal\n`)

    // Create a map of UDID -> device info
    const appleDeviceMap = new Map(
      appleDevices.map(d => [
        d.attributes.udid.toLowerCase(),
        {
          id: d.id,
          deviceClass: d.attributes.deviceClass,
          platform: deviceClassToPlatform(d.attributes.deviceClass),
          name: d.attributes.name,
          originalPlatform: d.attributes.platform
        }
      ])
    )

    // Fetch all users with their devices
    const users = await prisma.registeredUser.findMany({
      where: { ownerId: credentials.userId },
      include: {
        devices: {
          orderBy: { deviceNumber: 'asc' }
        }
      }
    })

    let totalUpdated = 0
    let totalSkipped = 0
    let totalNotInApple = 0

    for (const user of users) {
      if (user.devices.length === 0) continue
      
      console.log(`\n👤 Processing user: ${user.discordName} (${user.devices.length} devices)`)

      for (const device of user.devices) {
        const appleDevice = appleDeviceMap.get(device.udid.toLowerCase())

        if (!appleDevice) {
          console.log(`  ⚠️  Not in Apple: ${device.name} (${device.udid.slice(0, 16)}...)`)
          totalNotInApple++
          continue
        }

        // Check if platform needs updating
        const needsUpdate = device.platform !== appleDevice.platform

        if (needsUpdate) {
          // Generate new name with correct device type
          const newName = generateDeviceName(
            user.discordName,
            appleDevice.platform,
            device.deviceNumber,
            appleDevice.deviceClass
          )

          console.log(`  ✏️  Updating: ${device.platform} → ${appleDevice.platform} (${appleDevice.deviceClass})`)
          console.log(`      Old name: "${device.name}"`)
          console.log(`      New name: "${newName}"`)

          await prisma.userDevice.update({
            where: { id: device.id },
            data: {
              platform: appleDevice.platform,
              name: newName,
              appleDeviceId: appleDevice.id
            }
          })

          totalUpdated++
        } else {
          console.log(`  ✓  Already correct: ${device.name} (${appleDevice.deviceClass})`)
          
          // Update appleDeviceId if not set
          if (!device.appleDeviceId) {
            await prisma.userDevice.update({
              where: { id: device.id },
              data: { appleDeviceId: appleDevice.id }
            })
          }
          
          totalSkipped++
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Migration complete!')
    console.log(`   Updated:         ${totalUpdated} devices`)
    console.log(`   Already correct: ${totalSkipped} devices`)
    console.log(`   Not in Apple:    ${totalNotInApple} devices`)
    console.log(`   Total:           ${totalUpdated + totalSkipped + totalNotInApple} devices`)
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
