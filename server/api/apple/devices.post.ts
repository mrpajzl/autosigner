import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { z } from 'zod'

const schema = z.object({
  udid: z.string().min(1, 'UDID is required'),
  name: z.string().min(1, 'Device name is required'),
  platform: z.enum(['IOS', 'MAC_OS']).default('IOS')
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { udid, name, platform } = parsed.data

  const credentials = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id }
  })

  if (!credentials) {
    throw createError({
      statusCode: 400,
      message: 'Apple Developer credentials not configured. Please connect your account first.'
    })
  }

  // Decrypt the private key
  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()

  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  try {
    const device = await api.registerDevice(udid, name, platform)

    return {
      success: true,
      device: {
        id: device.id,
        name: device.attributes.name,
        udid: device.attributes.udid,
        platform: device.attributes.platform,
        deviceClass: device.attributes.deviceClass,
        status: device.attributes.status
      }
    }
  } catch (e: any) {
    // Check if device already exists
    if (e.message?.includes('ENTITY_ERROR.ATTRIBUTE.INVALID') || e.message?.includes('already exists')) {
      throw createError({
        statusCode: 409,
        message: 'This device UDID is already registered'
      })
    }
    throw createError({
      statusCode: 500,
      message: `Failed to register device: ${e.message}`
    })
  }
})

