import crypto from 'node:crypto'

interface AppleCredentials {
  keyId: string
  issuerId: string
  privateKey: string
}

interface AppleDevice {
  id: string
  type: string
  attributes: {
    name: string
    platform: string
    udid: string
    deviceClass: string
    status: string
    model?: string
    addedDate?: string
  }
}

interface AppleBundleId {
  id: string
  type: string
  attributes: {
    identifier: string
    name: string
    platform: string
    seedId?: string
  }
}

interface AppleProfile {
  id: string
  type: string
  attributes: {
    name: string
    platform: string
    profileType: string
    profileState: string
    profileContent: string // Base64 encoded .mobileprovision
    uuid: string
    createdDate: string
    expirationDate: string
  }
  relationships?: {
    certificates?: {
      data: { type: string; id: string }[]
    }
    bundleId?: {
      data: { type: string; id: string }
    }
  }
}

interface AppleCertificate {
  id: string
  type: string
  attributes: {
    name: string
    certificateType: string
    displayName: string
    serialNumber: string
    platform?: string
    expirationDate: string
    certificateContent?: string // Base64 encoded
  }
}

interface AppleApiResponse<T> {
  data: T | T[]
  links?: { self: string; next?: string }
  meta?: { paging?: { total: number; limit: number } }
  included?: any[]
  errors?: Array<{ id: string; status: string; code: string; title: string; detail: string }>
}

export class AppleDeveloperAPI {
  private baseUrl = 'https://api.appstoreconnect.apple.com/v1'
  private credentials: AppleCredentials

  constructor(credentials: AppleCredentials) {
    this.credentials = credentials
  }

  /**
   * Generate a JWT token for Apple API authentication
   * Tokens are valid for max 20 minutes
   */
  public generateToken(): string {
    const header = {
      alg: 'ES256',
      kid: this.credentials.keyId,
      typ: 'JWT'
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: this.credentials.issuerId,
      iat: now,
      exp: now + 20 * 60, // 20 minutes
      aud: 'appstoreconnect-v1'
    }

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signatureInput = `${headerB64}.${payloadB64}`

    // Sign with ES256 (ECDSA using P-256 and SHA-256)
    const sign = crypto.createSign('SHA256')
    sign.update(signatureInput)
    const signature = sign.sign(this.credentials.privateKey)

    // Convert DER signature to raw format (r || s)
    const rawSignature = this.derToRaw(signature)
    const signatureB64 = rawSignature.toString('base64url')

    return `${signatureInput}.${signatureB64}`
  }

  /**
   * Convert DER encoded ECDSA signature to raw (r || s) format
   */
  private derToRaw(derSignature: Buffer): Buffer {
    // DER format: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
    let offset = 2 // Skip 0x30 and total length

    // Parse r
    if (derSignature[offset] !== 0x02) throw new Error('Invalid DER signature')
    offset++
    const rLength = derSignature[offset]
    offset++
    let r = derSignature.subarray(offset, offset + rLength)
    offset += rLength

    // Parse s
    if (derSignature[offset] !== 0x02) throw new Error('Invalid DER signature')
    offset++
    const sLength = derSignature[offset]
    offset++
    let s = derSignature.subarray(offset, offset + sLength)

    // Remove leading zeros and pad to 32 bytes
    if (r.length > 32) r = r.subarray(r.length - 32)
    if (s.length > 32) s = s.subarray(s.length - 32)

    const raw = Buffer.alloc(64)
    r.copy(raw, 32 - r.length)
    s.copy(raw, 64 - s.length)

    return raw
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: any; params?: Record<string, string> } = {}
  ): Promise<AppleApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
    }

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${this.generateToken()}`,
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    // Some Apple endpoints (e.g. DELETE) return 204 with no body.
    // Handle that gracefully instead of trying to parse empty JSON.
    const text = await res.text()
    if (!text) {
      if (!res.ok) {
        throw new Error(`Apple API error: ${res.status}`)
      }
      return { data: null as any } as AppleApiResponse<T>
    }

    const json = JSON.parse(text) as AppleApiResponse<T>

    if (!res.ok || json.errors) {
      const error = json.errors?.[0]
      throw new Error(error?.detail || error?.title || `Apple API error: ${res.status}`)
    }

    return json
  }

  /**
   * Fetch all pages of a paginated endpoint
   */
  private async fetchAll<T>(path: string, params?: Record<string, string>): Promise<T[]> {
    const results: T[] = []
    let nextUrl: string | undefined = `${this.baseUrl}${path}`

    if (params) {
      const url = new URL(nextUrl)
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
      nextUrl = url.toString()
    }

    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${this.generateToken()}`,
          'Content-Type': 'application/json'
        }
      })

      const json = await res.json() as AppleApiResponse<T>
      if (!res.ok || json.errors) {
        throw new Error(json.errors?.[0]?.detail || `Apple API error: ${res.status}`)
      }

      if (Array.isArray(json.data)) {
        results.push(...json.data)
      } else {
        results.push(json.data)
      }

      nextUrl = json.links?.next
    }

    return results
  }

  // ============ DEVICES ============

  /**
   * List all registered devices
   */
  async listDevices(): Promise<AppleDevice[]> {
    return this.fetchAll<AppleDevice>('/devices', { limit: '200' })
  }

  /**
   * Register a new device
   */
  async registerDevice(
    udid: string,
    name: string,
    platform: 'IOS' | 'MAC_OS' | 'APPLE_TV' = 'IOS'
  ): Promise<AppleDevice> {
    const res = await this.request<AppleDevice>('/devices', {
      method: 'POST',
      body: {
        data: {
          type: 'devices',
          attributes: {
            udid,
            name,
            platform
          }
        }
      }
    })
    return res.data as AppleDevice
  }

  /**
   * Update device name
   */
  async updateDevice(deviceId: string, name: string): Promise<AppleDevice> {
    const res = await this.request<AppleDevice>(`/devices/${deviceId}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'devices',
          id: deviceId,
          attributes: { name }
        }
      }
    })
    return res.data as AppleDevice
  }

  // ============ BUNDLE IDS ============

  /**
   * List all bundle IDs
   */
  async listBundleIds(): Promise<AppleBundleId[]> {
    return this.fetchAll<AppleBundleId>('/bundleIds', { limit: '200' })
  }

  /**
   * Get a specific bundle ID by identifier
   */
  async getBundleIdByIdentifier(identifier: string): Promise<AppleBundleId | null> {
    const bundleIds = await this.fetchAll<AppleBundleId>('/bundleIds', {
      'filter[identifier]': identifier,
      limit: '1'
    })
    return bundleIds[0] || null
  }

  // ============ CERTIFICATES ============

  /**
   * List all certificates
   */
  async listCertificates(): Promise<AppleCertificate[]> {
    return this.fetchAll<AppleCertificate>('/certificates', { limit: '200' })
  }

  /**
   * Get certificates suitable for iOS development/distribution
   */
  async getSigningCertificates(): Promise<AppleCertificate[]> {
    const certs = await this.listCertificates()
    return certs.filter(c =>
      c.attributes.certificateType.includes('DISTRIBUTION') ||
      c.attributes.certificateType.includes('DEVELOPMENT')
    )
  }

  /**
   * Revoke (delete) a certificate by ID
   */
  async deleteCertificate(certificateId: string): Promise<void> {
    await this.request(`/certificates/${certificateId}`, { method: 'DELETE' })
  }

  // ============ PROFILES ============

  /**
   * List all provisioning profiles
   */
  async listProfiles(): Promise<AppleProfile[]> {
    // Include certificates so relationships.certificates.data is populated
    return this.fetchAll<AppleProfile>('/profiles', { limit: '200', include: 'certificates' })
  }

  /**
   * Get a specific profile with its content
   */
  async getProfile(profileId: string): Promise<AppleProfile> {
    const res = await this.request<AppleProfile>(`/profiles/${profileId}`)
    return res.data as AppleProfile
  }

  /**
   * Download profile content as Buffer
   */
  async downloadProfile(profileId: string): Promise<Buffer> {
    const profile = await this.getProfile(profileId)
    return Buffer.from(profile.attributes.profileContent, 'base64')
  }

  /**
   * Create a new provisioning profile
   */
  async createProfile(
    name: string,
    bundleIdId: string,
    certificateIds: string[],
    deviceIds: string[],
    profileType: 'IOS_APP_DEVELOPMENT' | 'IOS_APP_ADHOC' | 'IOS_APP_STORE' | 'TVOS_APP_DEVELOPMENT' | 'TVOS_APP_ADHOC' | 'TVOS_APP_STORE'
  ): Promise<AppleProfile> {
    const res = await this.request<AppleProfile>('/profiles', {
      method: 'POST',
      body: {
        data: {
          type: 'profiles',
          attributes: {
            name,
            profileType
          },
          relationships: {
            bundleId: {
              data: { type: 'bundleIds', id: bundleIdId }
            },
            certificates: {
              data: certificateIds.map(id => ({ type: 'certificates', id }))
            },
            devices: {
              data: deviceIds.map(id => ({ type: 'devices', id }))
            }
          }
        }
      }
    })
    return res.data as AppleProfile
  }

  /**
   * Delete a provisioning profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    await this.request(`/profiles/${profileId}`, { method: 'DELETE' })
  }

  /**
   * Regenerate a profile by deleting and recreating it with updated devices
   * Returns the new profile
   */
  async regenerateProfile(
    profileId: string,
    deviceIds: string[]
  ): Promise<AppleProfile> {
    // First, get the existing profile details
    const existingRes = await this.request<AppleProfile>(`/profiles/${profileId}`, {
      params: { include: 'bundleId,certificates' }
    }) as AppleApiResponse<AppleProfile> & { included?: any[] }

    const existing = existingRes.data as AppleProfile
    const included = existingRes.included || []

    // Extract bundle ID and certificate IDs from included
    const bundleId = included.find((i: any) => i.type === 'bundleIds')
    const certificates = included.filter((i: any) => i.type === 'certificates')

    if (!bundleId) {
      throw new Error('Could not find bundle ID for profile')
    }

    // Delete the old profile
    await this.deleteProfile(profileId)

    // Create new profile with same settings but updated devices
    return this.createProfile(
      existing.attributes.name,
      bundleId.id,
      certificates.map((c: any) => c.id),
      deviceIds,
      existing.attributes.profileType as any
    )
  }

  /**
   * Create a new certificate using a CSR
   * @param csrContent The PEM encoded CSR content
   * @param certificateType The type of certificate to create (e.g., IOS_DISTRIBUTION)
   */
  async createCertificate(
    csrContent: string,
    certificateType: string
  ): Promise<AppleCertificate> {
    const res = await this.request<AppleCertificate>('/certificates', {
      method: 'POST',
      body: {
        data: {
          type: 'certificates',
          attributes: {
            certificateType,
            csrContent
          }
        }
      }
    })
    return res.data as AppleCertificate
  }

  // ============ VALIDATION ============

  /**
   * Test if credentials are valid by fetching devices
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.request('/devices', { params: { limit: '1' } })
      return { valid: true }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }
}

// Export types for use in API routes
export type { AppleDevice, AppleBundleId, AppleProfile, AppleCertificate, AppleCredentials }

