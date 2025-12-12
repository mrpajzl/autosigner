import { requireUser } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const certId = getRouterParam(event, 'id')

  if (!certId) {
    throw createError({ statusCode: 400, message: 'Certificate ID is required' })
  }

  const cert = await prisma.certificate.findFirst({
    where: {
      id: certId,
      userId: user.id
    }
  })

  if (!cert) {
    throw createError({ statusCode: 404, message: 'Certificate not found' })
  }

  const filename = cert.displayName 
    ? `${cert.displayName.replace(/[^a-zA-Z0-9]/g, '_')}.p12`
    : `certificate_${cert.id}.p12`

  const buffer = Buffer.from(cert.p12Data)
  
  setHeader(event, 'Content-Type', 'application/x-pkcs12')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  setHeader(event, 'Content-Length', String(buffer.length))
  
  return buffer
})

