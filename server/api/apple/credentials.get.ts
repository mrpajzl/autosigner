import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])

  const credentials = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      keyId: true,
      issuerId: true,
      teamName: true,
      createdAt: true,
      updatedAt: true
      // Note: privateKeyEnc is NOT returned for security
    }
  })

  return {
    connected: !!credentials,
    credentials: credentials ? {
      id: credentials.id,
      keyId: credentials.keyId,
      issuerId: credentials.issuerId,
      teamName: credentials.teamName,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt
    } : null
  }
})


