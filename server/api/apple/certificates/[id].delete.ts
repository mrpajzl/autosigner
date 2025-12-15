import { requireAnyRole } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { decrypt } from '../../../utils/crypto'
import { AppleDeveloperAPI } from '../../../utils/apple-api'

export default defineEventHandler(async (event) => {
  const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Certificate ID is required' })
  }

  const credentials = await prisma.appleDeveloperCredentials.findUnique({
    where: { userId: user.id }
  })

  if (!credentials) {
    throw createError({
      statusCode: 400,
      message: 'Apple Developer credentials not configured. Please connect your account first.'
    })
  }

  const privateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()

  const api = new AppleDeveloperAPI({
    keyId: credentials.keyId,
    issuerId: credentials.issuerId,
    privateKey
  })

  try {
    await api.deleteCertificate(id)
    return { success: true }
  } catch (e: any) {
    const rawMessage = e?.message || ''
    // Apple sometimes reports "not in an \"issued\" state" even when the certificate
    // is effectively no longer usable (expired or already revoked). In either case,
    // the end result for the user is that the certificate cannot be used, so we
    // treat this as a successful revoke to avoid confusing UX.
    if (rawMessage.includes('not in an "issued" state')) {
      return { success: true, alreadyUnusable: true }
    }

    throw createError({
      statusCode: 500,
      message: `Failed to revoke certificate: ${rawMessage}`
    })
  }
})


