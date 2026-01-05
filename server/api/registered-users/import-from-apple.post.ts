import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { deviceClassToPlatform, getNextDeviceNumber } from '../../utils/device-naming'
import { z } from 'zod'

const deviceMappingSchema = z.object({
  udid: z.string(),
  name: z.string(),
  platform: z.string(),
  discordName: z.string().min(1, 'Discord name is required'),
  discordId: z.string().optional(), // Optional Discord ID for matching
  skip: z.boolean().optional()
})

const schema = z.object({
  mappings: z.array(deviceMappingSchema)
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { mappings } = parsed.data

  // Filter out skipped mappings
  const validMappings = mappings.filter(m => !m.skip && m.discordName)

  if (validMappings.length === 0) {
    return { imported: 0, users: [], skipped: mappings.length }
  }

  // Get Apple credentials to validate devices exist
  const credentials = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id }
  })

  if (!credentials) {
    throw createError({
      statusCode: 400,
      message: 'Apple Developer credentials not configured'
    })
  }

  // Verify with Apple that these devices exist
  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()
  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  let appleDevices: Map<string, { name: string; platform: string; deviceClass: string; id: string }>
  try {
    const devices = await api.listDevices()
    appleDevices = new Map(
      devices.map(d => [d.attributes.udid.toLowerCase(), {
        name: d.attributes.name,
        platform: d.attributes.platform,
        deviceClass: d.attributes.deviceClass,
        id: d.id
      }])
    )
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch devices from Apple: ${e.message}`
    })
  }

  // Group mappings by discord name
  const groupedByUser = new Map<string, Array<{ udid: string; name: string; platform: string; deviceClass: string; appleDeviceId: string }>>()
  
  for (const mapping of validMappings) {
    const normalizedUdid = mapping.udid.toLowerCase()
    
    // Verify the device exists in Apple
    const appleDevice = appleDevices.get(normalizedUdid)
    if (!appleDevice) {
      // Skip devices that don't exist in Apple (might have been removed)
      continue
    }

    // Use the correct platform from Apple's deviceClass
    const correctPlatform = deviceClassToPlatform(appleDevice.deviceClass)

    const discordName = mapping.discordName.trim()
    if (!groupedByUser.has(discordName)) {
      groupedByUser.set(discordName, [])
    }
    groupedByUser.get(discordName)!.push({
      udid: mapping.udid,
      name: mapping.name,
      platform: correctPlatform,
      deviceClass: appleDevice.deviceClass,
      appleDeviceId: appleDevice.id
    })
  }

  // Create or update users and add devices
  const results: Array<{ discordName: string; devicesAdded: number; isNew: boolean }> = []

  for (const [discordName, devices] of groupedByUser) {
    // Get the Discord ID from the first mapping (they should all have the same)
    const firstMapping = validMappings.find(m => m.discordName === discordName)
    const discordId = firstMapping?.discordId

    // Find or create the registered user
    let registeredUser = await prisma.registeredUser.findUnique({
      where: {
        ownerId_discordName: {
          ownerId: user.id,
          discordName
        }
      }
    })

    const isNew = !registeredUser

    if (!registeredUser) {
      registeredUser = await prisma.registeredUser.create({
        data: {
          ownerId: user.id,
          discordName,
          discordId: discordId || null
        }
      })

      // If Discord ID is provided, try to link with existing Discord user
      if (discordId) {
        const discordUser = await prisma.user.findUnique({
          where: { discordId }
        })

        if (discordUser) {
          // Link the registered user to the Discord user
          await prisma.registeredUser.update({
            where: { id: registeredUser.id },
            data: { linkedUserId: discordUser.id }
          })
        }
      }
    } else if (discordId && !registeredUser.discordId) {
      // Update existing registered user with Discord ID if not already set
      await prisma.registeredUser.update({
        where: { id: registeredUser.id },
        data: { discordId }
      })

      // Try to link with Discord user
      const discordUser = await prisma.user.findUnique({
        where: { discordId }
      })

      if (discordUser && !registeredUser.linkedUserId) {
        await prisma.registeredUser.update({
          where: { id: registeredUser.id },
          data: { linkedUserId: discordUser.id }
        })
      }
    }

    // Add devices (skip duplicates)
    let devicesAdded = 0
    for (const device of devices) {
      try {
        // Get the next device number for this user and platform
        const deviceNumber = await getNextDeviceNumber(registeredUser.id, device.platform, prisma)
        
        await prisma.userDevice.create({
          data: {
            registeredUserId: registeredUser.id,
            udid: device.udid,
            name: device.name,
            platform: device.platform,
            deviceNumber,
            appleDeviceId: device.appleDeviceId
          }
        })
        devicesAdded++
      } catch (e: any) {
        // Skip if device already exists (unique constraint violation)
        if (!e.message?.includes('Unique constraint')) {
          throw e
        }
      }
    }

    results.push({
      discordName,
      devicesAdded,
      isNew
    })
  }

  return {
    imported: results.reduce((sum, r) => sum + r.devicesAdded, 0),
    users: results,
    skipped: mappings.filter(m => m.skip).length
  }
})

