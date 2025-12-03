import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { encrypt, decrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { z } from 'zod'

const schema = z.object({
  keyId: z.string().min(1, 'Key ID is required'),
  issuerId: z.string().min(1, 'Issuer ID is required'),
  privateKey: z.string().min(1, 'Private key is required'),
  teamName: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const body = await readBody(event)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  const { keyId, issuerId, privateKey, teamName } = parsed.data

  // Validate credentials by testing them against Apple's API
  const api = new AppleDeveloperAPI({ keyId, issuerId, privateKey })
  const validation = await api.validateCredentials()

  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      message: `Invalid Apple credentials: ${validation.error}`
    })
  }

  // Encrypt the private key before storing
  const privateKeyEnc = JSON.stringify(encrypt(privateKey))

  // Upsert credentials (create or update)
  const credentials = await prisma.appleDeveloperCredentials.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      keyId,
      issuerId,
      privateKeyEnc,
      teamName: teamName || null
    },
    update: {
      keyId,
      issuerId,
      privateKeyEnc,
      teamName: teamName || null
    },
    select: {
      id: true,
      keyId: true,
      issuerId: true,
      teamName: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return { success: true, credentials }
})


