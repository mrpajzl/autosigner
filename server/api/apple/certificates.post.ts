import { requireAnyRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { decrypt, encrypt } from '../../utils/crypto'
import { AppleDeveloperAPI } from '../../utils/apple-api'
import { generateCSR, createP12 } from '../../utils/pki'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import path from 'node:path'
import fse from 'fs-extra'

const schema = z.object({
    certificateType: z.enum(['IOS_DISTRIBUTION', 'IOS_DEVELOPMENT', 'MAC_APP_DISTRIBUTION', 'MAC_INSTALLER_DISTRIBUTION', 'DEVELOPER_ID_KEXT', 'DEVELOPER_ID_APPLICATION', 'DEVELOPMENT', 'DISTRIBUTION']),
    displayName: z.string().optional(),
    password: z.string().optional()
})

export default defineEventHandler(async (event) => {
    const user = await requireAnyRole(event, ['MANAGER', 'SUPERADMIN'])
    const body = await readBody(event)

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
        throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
    }

    const { certificateType, displayName, password } = parsed.data

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
    const apiPrivateKey = decrypt(JSON.parse(credentials.privateKeyEnc)).toString()

    const api = new AppleDeveloperAPI({
        keyId: credentials.keyId,
        issuerId: credentials.issuerId,
        privateKey: apiPrivateKey
    })

    try {
        // 1. Generate Key and CSR
        // We use a placeholder email since user email is not strictly typed/available here
        // Ideally we should use the Apple ID email but we don't store it explicitly in credentials usually.
        const email = 'admin@fastsigner.local'
        const commonName = displayName || `FastSigner Certificate ${nanoid(6)}`

        const { privateKey, csr } = await generateCSR(commonName, email)

        // 2. Submit CSR to Apple
        const appleCert = await api.createCertificate(csr, certificateType)

        // Apple might return the content immediately or might need a delay?
        // The API usually returns it immediately in the attributes.
        if (!appleCert.attributes.certificateContent) {
            throw new Error('Apple did not return certificate content immediately')
        }

        const certContent = `-----BEGIN CERTIFICATE-----\n${appleCert.attributes.certificateContent}\n-----END CERTIFICATE-----`

        // 3. Create P12
        const p12Password = password || nanoid(32) // Use provided password or generate a strong random one

        // Load Intermediate Certificate
        const intermediatePath = path.join(process.cwd(), 'server/assets/AppleWWDRCA.pem')
        let intermediateCert: string | undefined
        try {
            intermediateCert = await fse.readFile(intermediatePath, 'utf8')
        } catch (e) {
            console.warn('Warning: AppleWWDRCA.pem not found, P12 will be created without intermediate certificate.')
        }

        const p12Buffer = await createP12(privateKey, certContent, p12Password, intermediateCert)

        // 4. Save to DB
        const expirationDate = appleCert.attributes.expirationDate ? new Date(appleCert.attributes.expirationDate) : undefined

        const created = await prisma.certificate.create({
            data: {
                userId: user.id,
                displayName: displayName || appleCert.attributes.name,
                p12Data: p12Buffer,
                p12PasswordEnc: JSON.stringify(encrypt(p12Password)),
                expiresAt: expirationDate,
                // We could store serial number etc if we expanded the schema, but standard schema is enough
            }
        })

        return {
            success: true,
            id: created.id,
            appleId: appleCert.id,
            name: created.displayName,
            expiresAt: created.expiresAt
        }

    } catch (e: any) {
        throw createError({
            statusCode: 500,
            message: `Failed to create certificate: ${e.message}`
        })
    }
})
