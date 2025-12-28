<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Local certificates -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-identification" />
            <span class="card-title">Local Certificates</span>
          </div>
          <UButton icon="i-heroicons-plus" size="xs" color="black" @click="isCreateModalOpen = true">Create via API</UButton>
        </div>
      </template>

      <div class="space-y-4">
        <form class="grid md:grid-cols-3 gap-4" @submit.prevent="onUpload">
          <UFormGroup label="Display Name">
            <UInput v-model="displayName" />
          </UFormGroup>
          <UFormGroup label="P12 File">
            <input ref="p12Ref" type="file" accept=".p12,.pfx" class="block w-full text-sm" />
          </UFormGroup>
          <UFormGroup label="P12 Password (if any)">
            <UInput v-model="p12Password" type="password" autocomplete="new-password" />
          </UFormGroup>
          <div class="md:col-span-3 flex items-center gap-3">
            <UButton type="submit" color="red">Upload</UButton>
            <p v-if="message" class="text-sm text-slate-600 dark:text-white/70">{{ message }}</p>
          </div>
        </form>

        <UTable :rows="rows" :columns="columns">
          <template #active-data="{ row }">
            <UBadge :color="row.active ? 'green' : 'gray'">{{ row.active ? 'Active' : 'Inactive' }}</UBadge>
          </template>
          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton size="xs" color="white" variant="soft" @click="activate(row.id)" :disabled="row.active">Activate</UButton>
              <UButton size="xs" color="red" variant="soft" @click="remove(row.id)">Delete</UButton>
            </div>
          </template>
        </UTable>
      </div>

      <UModal v-model="isCreateModalOpen">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Create New Certificate
              </h3>
              <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isCreateModalOpen = false" />
            </div>
          </template>

          <form @submit.prevent="createCert" class="space-y-4">
            <UFormGroup label="Certificate Type" required>
              <USelect v-model="createForm.certificateType" :options="certTypes" />
            </UFormGroup>
            
            <UFormGroup label="Display Name" help="Optional, will use Apple ID name if empty">
              <UInput v-model="createForm.displayName" placeholder="e.g. My Distribution Cert" />
            </UFormGroup>
            
            <UFormGroup label="P12 Password" help="Optional, leave empty to generate a random secure password">
              <UInput v-model="createForm.password" type="password" autocomplete="new-password" placeholder="••••••••" />
            </UFormGroup>

            <div class="flex justify-end gap-2 pt-4">
              <UButton color="gray" variant="soft" @click="isCreateModalOpen = false">Cancel</UButton>
              <UButton type="submit" color="black" :loading="isCreating">Create Certificate</UButton>
            </div>
          </form>
        </UCard>
      </UModal>
    </UCard>

    <!-- Apple Developer certificates -->
    <UAlert
      v-if="!appleConnected"
      icon="i-heroicons-exclamation-triangle"
      color="yellow"
      variant="soft"
      title="Apple Developer Connection Required"
    >
      <template #description>
        <p class="mb-2">Connect your Apple Developer account to manage certificates directly from Apple.</p>
        <UButton to="/profile/apple-developer" size="sm" color="yellow" variant="solid">
          Connect Now
        </UButton>
      </template>
    </UAlert>

    <UCard v-if="appleConnected" class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-identification" />
            <span class="card-title">Apple Developer Certificates</span>
            <UBadge color="gray" variant="soft">{{ appleCertificatesFiltered.length }}</UBadge>
          </div>
          <div class="flex items-center gap-2">
            <USelect v-model="appleFilter" :options="appleFilterOptions" size="sm" />
            <UButton
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              :loading="appleRefreshing"
              @click="refreshApple"
            />
          </div>
        </div>
      </template>

      <div v-if="appleLoading" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>

      <div v-else-if="appleError" class="text-center py-8">
        <p class="text-red-400 mb-2">{{ appleError }}</p>
        <UButton color="gray" variant="soft" @click="refreshApple">Try Again</UButton>
      </div>

      <div v-else-if="appleCertificatesFiltered.length === 0" class="text-center py-8 text-slate-500 dark:text-white/50">
        <UIcon name="i-heroicons-identification" class="text-4xl mb-2" />
        <p>No certificates found for your Apple Developer account.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="cert in appleCertificatesFiltered"
          :key="cert.id"
          class="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-medium truncate">
                  {{ cert.displayName || cert.name || 'Unnamed Certificate' }}
                </p>
                <UBadge
                  :color="isAppleExpired(cert.expirationDate) ? 'red' : 'green'"
                  variant="soft"
                  size="xs"
                >
                  {{ isAppleExpired(cert.expirationDate) ? 'Expired' : 'Valid' }}
                </UBadge>
                <UBadge color="gray" variant="soft" size="xs">
                  {{ cert.certificateType }}
                </UBadge>
                <UBadge v-if="cert.platform" color="blue" variant="soft" size="xs">
                  {{ cert.platform }}
                </UBadge>
              </div>
              <p class="text-xs text-slate-500 dark:text-white/40">
                Serial: {{ cert.serialNumber }}
                <span v-if="cert.expirationDate">
                  • Expires: {{ new Date(cert.expirationDate).toLocaleDateString() }}
                </span>
              </p>

              <div class="mt-2">
                <p class="text-xs text-slate-500 dark:text-white/50 mb-1">
                  Used in {{ cert.usedByProfiles.length }} provisioning profile{{ cert.usedByProfiles.length !== 1 ? 's' : '' }}:
                </p>
                <div v-if="cert.usedByProfiles.length" class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="profile in cert.usedByProfiles"
                    :key="profile.id"
                    color="gray"
                    variant="soft"
                    size="xs"
                    class="max-w-xs truncate"
                  >
                    {{ profile.name }} ({{ profile.profileType }})
                  </UBadge>
                </div>
                <p v-else class="text-xs text-slate-500 dark:text-white/40">
                  Not currently attached to any provisioning profiles.
                </p>
              </div>
            </div>

            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <div class="flex gap-2">
                <UButton
                  color="blue"
                  variant="soft"
                  size="sm"
                  icon="i-heroicons-link"
                  :loading="assigningCertId === cert.id"
                  @click="openAssignToProfiles(cert)"
                >
                  Assign to Profiles
                </UButton>
                <UButton
                  color="red"
                  variant="soft"
                  size="sm"
                  icon="i-heroicons-trash"
                  :loading="appleRevokingId === cert.id"
                  @click="openAppleRevoke(cert)"
                >
                  Revoke
                </UButton>
              </div>
              <p v-if="cert.usedByProfiles.length" class="text-[11px] text-red-400 text-right max-w-xs">
                Revoking this certificate will invalidate all attached profiles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Assign Certificate to Profiles Modal -->
    <UModal v-model="showAssignToProfilesModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Assign Certificate to Profiles
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showAssignToProfilesModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Select provisioning profiles to assign certificate
            <strong class="ml-1">{{ selectedCertForAssign?.displayName || selectedCertForAssign?.name || 'Unnamed Certificate' }}</strong>
            to. This will regenerate each selected profile with the new certificate.
          </p>

          <div v-if="loadingProfiles" class="py-4 text-center">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
            <p class="text-sm text-gray-500 mt-2">Loading profiles...</p>
          </div>

          <div v-else-if="availableProfiles.length === 0" class="py-4 text-center text-gray-500">
            <p>No profiles available to assign this certificate to.</p>
          </div>

          <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedProfileIds.length }} of {{ availableProfiles.length }} selected
              </span>
              <UButton size="xs" color="gray" variant="ghost" @click="toggleAllProfiles">
                {{ selectedProfileIds.length === availableProfiles.length ? 'Deselect All' : 'Select All' }}
              </UButton>
            </div>
            <div class="space-y-2 border border-gray-200 dark:border-white/10 rounded-lg p-2">
              <label
                v-for="profile in availableProfiles"
                :key="profile.id"
                class="flex items-start gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="profile.id"
                  v-model="selectedProfileIds"
                  class="mt-1 rounded"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-medium">{{ profile.name }}</span>
                    <UBadge :color="getProfileStateColor(profile.profileState)" variant="soft" size="xs">
                      {{ profile.profileState }}
                    </UBadge>
                    <UBadge color="gray" variant="soft" size="xs">
                      {{ formatProfileType(profile.profileType) }}
                    </UBadge>
                    <UBadge color="blue" variant="soft" size="xs">{{ profile.platform }}</UBadge>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    UUID: {{ profile.uuid }}
                    <span v-if="profile.certificateCount > 0">
                      • Currently has {{ profile.certificateCount }} certificate{{ profile.certificateCount !== 1 ? 's' : '' }}
                    </span>
                  </p>
                </div>
              </label>
            </div>
          </div>

          <UAlert
            v-if="assignError"
            icon="i-heroicons-exclamation-triangle"
            color="red"
            variant="soft"
            :title="assignError"
          />
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showAssignToProfilesModal = false">
              Cancel
            </UButton>
            <UButton
              color="blue"
              :loading="assigningCertId === selectedCertForAssign?.id"
              :disabled="selectedProfileIds.length === 0"
              @click="handleAssignToProfiles"
            >
              Assign to {{ selectedProfileIds.length }} Profile{{ selectedProfileIds.length !== 1 ? 's' : '' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Apple revoke confirmation modal -->
    <UModal v-model="showAppleRevokeModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Revoke Apple Certificate
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showAppleRevokeModal = false"
            />
          </div>
        </template>

        <div class="space-y-3">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to revoke this certificate?
          </p>
          <p class="text-sm">
            <span class="font-semibold">
              {{ selectedAppleCert?.displayName || selectedAppleCert?.name || 'Unnamed Certificate' }}
            </span>
          </p>
          <UAlert
            v-if="selectedAppleCert && selectedAppleCert.usedByProfiles.length"
            icon="i-heroicons-exclamation-triangle"
            color="red"
            variant="soft"
            title="Profiles will be invalidated"
          >
            <template #description>
              <p class="text-sm">
                This certificate is used in {{ selectedAppleCert.usedByProfiles.length }}
                provisioning profile{{ selectedAppleCert.usedByProfiles.length !== 1 ? 's' : '' }}.
                After revocation, those profiles will become invalid and apps signed with them may stop working.
              </p>
            </template>
          </UAlert>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showAppleRevokeModal = false">
              Cancel
            </UButton>
            <UButton
              color="red"
              :loading="appleRevokingId === selectedAppleCert?.id"
              @click="revokeAppleCert"
            >
              Revoke Certificate
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
  
</template>

<script setup lang="ts">
definePageMeta({ title: 'Certificates', layout: 'default' })

type CertRow = { id: string; displayName?: string | null; createdAt: string; active: boolean }
const columns = [
  { key: 'displayName', label: 'Name' },
  { key: 'createdAt', label: 'Uploaded' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const { data: rows, refresh } = await useFetch<CertRow[]>('/api/profile/certificates')

// Apple Developer certificates
interface AppleProfileUsage {
  id: string
  name: string
  platform: string
  profileType: string
  profileState: string
  uuid: string
  expirationDate: string
}

interface AppleCertWithUsage {
  id: string
  name: string
  displayName: string | null
  certificateType: string
  serialNumber: string
  platform?: string | null
  expirationDate?: string | null
  usedByProfiles: AppleProfileUsage[]
}

const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

const {
  data: appleData,
  pending: appleLoading,
  error: appleFetchError,
  refresh: refreshAppleData
} = await useFetch<AppleCertWithUsage[]>('/api/apple/certificates/usage', {
  immediate: true,
  default: () => []
})

const appleCertificates = computed(() => appleData.value || [])
const appleError = computed(() => appleFetchError.value?.data?.message || (appleFetchError.value ? 'Failed to load certificates from Apple' : ''))

const appleFilter = ref('ALL')
const appleFilterOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'In Use', value: 'IN_USE' },
  { label: 'Not Used', value: 'NOT_USED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Valid', value: 'VALID' }
]

const appleRefreshing = ref(false)
const appleRevokingId = ref<string | null>(null)
const showAppleRevokeModal = ref(false)
const selectedAppleCert = ref<AppleCertWithUsage | null>(null)

// Assign to profiles
const showAssignToProfilesModal = ref(false)
const selectedCertForAssign = ref<AppleCertWithUsage | null>(null)
const availableProfiles = ref<any[]>([])
const selectedProfileIds = ref<string[]>([])
const loadingProfiles = ref(false)
const assigningCertId = ref<string | null>(null)
const assignError = ref('')
const newlyCreatedCertId = ref<string | null>(null)

const appleCertificatesFiltered = computed(() => {
  const list = appleCertificates.value
  switch (appleFilter.value) {
    case 'IN_USE':
      return list.filter(c => c.usedByProfiles.length > 0)
    case 'NOT_USED':
      return list.filter(c => c.usedByProfiles.length === 0)
    case 'EXPIRED':
      return list.filter(c => isAppleExpired(c.expirationDate))
    case 'VALID':
      return list.filter(c => !isAppleExpired(c.expirationDate))
    default:
      return list
  }
})

function isAppleExpired(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

async function refreshApple() {
  appleRefreshing.value = true
  try {
    await refreshAppleData()
  } finally {
    appleRefreshing.value = false
  }
}

function openAppleRevoke(cert: AppleCertWithUsage) {
  selectedAppleCert.value = cert
  showAppleRevokeModal.value = true
}

async function revokeAppleCert() {
  if (!selectedAppleCert.value) return
  appleRevokingId.value = selectedAppleCert.value.id
  try {
    await $fetch(`/api/apple/certificates/${selectedAppleCert.value.id}`, { method: 'DELETE' })
    showAppleRevokeModal.value = false
    await refreshApple()
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to revoke certificate')
  } finally {
    appleRevokingId.value = null
  }
}

const displayName = ref('')
const p12Ref = ref<HTMLInputElement | null>(null)
const p12Password = ref('')
const message = ref('')

// Manual Creation UI
const isCreateModalOpen = ref(false)
const isCreating = ref(false)
const createForm = reactive({
  certificateType: 'IOS_DISTRIBUTION',
  displayName: '',
  password: ''
})

const certTypes = [
  { label: 'Apple Distribution (Recommended - iOS, tvOS, macOS)', value: 'DISTRIBUTION' },
  { label: 'iOS Distribution (App Store & Ad Hoc)', value: 'IOS_DISTRIBUTION' },
  { label: 'iOS Development', value: 'IOS_DEVELOPMENT' },
  { label: 'Mac App Distribution', value: 'MAC_APP_DISTRIBUTION' },
  { label: 'Apple Development', value: 'DEVELOPMENT' }
]

async function createCert() {
  isCreating.value = true
  message.value = ''
  try {
    const result = await $fetch<{ id?: string; appleId?: string }>('/api/apple/certificates', {
      method: 'POST',
      body: {
        certificateType: createForm.certificateType,
        displayName: createForm.displayName || undefined,
        password: createForm.password || undefined
      }
    })
    isCreateModalOpen.value = false
    message.value = 'Certificate created successfully!'
    createForm.displayName = ''
    createForm.password = ''
    await refresh()
    await refreshApple()
    
    // If certificate was created, offer to assign it to profiles
    if (result.appleId) {
      newlyCreatedCertId.value = result.appleId
      // Wait a moment for the certificate to appear in the list
      setTimeout(async () => {
        await refreshApple()
        const newCert = appleCertificates.value.find(c => c.id === result.appleId)
        if (newCert) {
          openAssignToProfiles(newCert)
        }
      }, 500)
    }
  } catch (e: any) {
    message.value = e?.data?.message || 'Failed to create certificate'
  } finally {
    isCreating.value = false
  }
}

async function onUpload() {
  try {
    const fd = new FormData()
    if (displayName.value) fd.set('displayName', displayName.value)
    const p12 = p12Ref.value?.files?.[0]
    if (p12) fd.set('p12', p12)
    if (p12Password.value) fd.set('p12Password', p12Password.value)
    await $fetch('/api/profile/certificates', { method: 'POST', body: fd })
    message.value = 'Uploaded.'
    await refresh()
  } catch (e: any) {
    message.value = e?.data?.message || 'Upload failed'
  }
}

async function activate(id: string) {
  await $fetch(`/api/profile/certificates/${id}/activate`, { method: 'POST' })
  await refresh()
}
async function remove(id: string) {
  await $fetch(`/api/profile/certificates/${id}`, { method: 'DELETE' })
  await refresh()
}

// Assign certificate to profiles
interface AppleProfileForAssign {
  id: string
  name: string
  platform: string
  profileType: string
  profileState: string
  uuid: string
  certificateCount: number
}

async function openAssignToProfiles(cert: AppleCertWithUsage) {
  selectedCertForAssign.value = cert
  selectedProfileIds.value = []
  assignError.value = ''
  showAssignToProfilesModal.value = true
  loadingProfiles.value = true

  try {
    const profiles = await $fetch<AppleProfileForAssign[]>('/api/apple/profiles')
    // Filter profiles that can use this certificate type
    // For now, show all profiles - the API will validate compatibility
    availableProfiles.value = profiles.filter(p => {
      // Only show profiles that are ACTIVE or INVALID (can be regenerated)
      return p.profileState === 'ACTIVE' || p.profileState === 'INVALID'
    })
  } catch (e: any) {
    assignError.value = e?.data?.message || 'Failed to load profiles'
    availableProfiles.value = []
  } finally {
    loadingProfiles.value = false
  }
}

function toggleAllProfiles() {
  if (selectedProfileIds.value.length === availableProfiles.value.length) {
    selectedProfileIds.value = []
  } else {
    selectedProfileIds.value = availableProfiles.value.map(p => p.id)
  }
}

function getProfileStateColor(state: string) {
  switch (state) {
    case 'ACTIVE': return 'green'
    case 'INVALID': return 'red'
    default: return 'gray'
  }
}

function formatProfileType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

async function handleAssignToProfiles() {
  if (!selectedCertForAssign.value || selectedProfileIds.value.length === 0) return

  assigningCertId.value = selectedCertForAssign.value.id
  assignError.value = ''

  const results: { success: number; failed: number; errors: string[] } = {
    success: 0,
    failed: 0,
    errors: []
  }

  // Assign certificate to each selected profile
  for (const profileId of selectedProfileIds.value) {
    try {
      await $fetch(`/api/apple/profiles/${profileId}/regenerate`, {
        method: 'POST',
        body: {
          activateAfter: false, // Don't auto-activate, just assign the certificate
          certificateIds: [selectedCertForAssign.value.id]
        }
      })
      results.success++
    } catch (e: any) {
      results.failed++
      const profileName = availableProfiles.value.find(p => p.id === profileId)?.name || profileId
      results.errors.push(`${profileName}: ${e?.data?.message || 'Failed to assign certificate'}`)
    }
  }

  assigningCertId.value = null

  if (results.failed === 0) {
    // All succeeded
    showAssignToProfilesModal.value = false
    message.value = `Successfully assigned certificate to ${results.success} profile${results.success !== 1 ? 's' : ''}!`
    await refreshApple()
  } else if (results.success > 0) {
    // Partial success
    assignError.value = `Assigned to ${results.success} profile${results.success !== 1 ? 's' : ''}, but ${results.failed} failed:\n${results.errors.join('\n')}`
    await refreshApple()
  } else {
    // All failed
    assignError.value = `Failed to assign certificate:\n${results.errors.join('\n')}`
  }
}
</script>


