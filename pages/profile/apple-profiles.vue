<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Connection Required Alert -->
    <UAlert
      v-if="!appleConnected"
      icon="i-heroicons-exclamation-triangle"
      color="yellow"
      variant="soft"
      title="Apple Developer Connection Required"
    >
      <template #description>
        <p class="mb-2">You need to connect your Apple Developer account to view profiles from Apple.</p>
        <UButton to="/profile/apple-developer" size="sm" color="yellow" variant="solid">
          Connect Now
        </UButton>
      </template>
    </UAlert>

    <!-- Create New Profile -->
    <UCard v-if="appleConnected" class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-plus-circle" />
            <span class="font-semibold">Create New Provisioning Profile</span>
          </div>
          <UButton 
            :icon="showCreateForm ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            color="gray"
            variant="ghost"
            @click="showCreateForm = !showCreateForm"
          />
        </div>
      </template>

      <div v-if="showCreateForm" class="space-y-4">
        <form @submit.prevent="handleCreate">
          <div class="grid md:grid-cols-2 gap-4">
            <UFormGroup label="Profile Name" required>
              <UInput v-model="createForm.name" placeholder="My App Ad Hoc" />
            </UFormGroup>
            <UFormGroup label="Profile Type" required>
              <USelect v-model="createForm.profileType" :options="profileTypeOptions" />
            </UFormGroup>
          </div>

          <UDivider class="my-4" />

          <!-- Bundle ID Selection -->
          <UFormGroup label="Bundle ID" required class="mb-4">
            <div v-if="loadingBundleIds" class="py-2">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin" /> Loading bundle IDs...
            </div>
            <USelect v-else v-model="createForm.bundleIdId" :options="bundleIdOptions" placeholder="Select a bundle ID" />
          </UFormGroup>

          <!-- Certificate Selection -->
          <UFormGroup label="Certificates" required class="mb-4">
            <div v-if="loadingCerts" class="py-2">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin" /> Loading certificates...
            </div>
            <div v-else class="space-y-2 max-h-40 overflow-y-auto">
              <label v-for="cert in appleCertificates" :key="cert.id" class="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                <input type="checkbox" :value="cert.id" v-model="createForm.certificateIds" class="rounded" />
                <span class="text-sm">{{ cert.displayName || cert.name }}</span>
                <UBadge color="gray" variant="soft" size="xs">{{ cert.certificateType }}</UBadge>
              </label>
              <p v-if="appleCertificates.length === 0" class="text-sm text-slate-500 dark:text-white/50">No certificates found</p>
            </div>
          </UFormGroup>

          <!-- Device Selection -->
          <UFormGroup label="Devices" required class="mb-4">
            <div v-if="loadingDevices" class="py-2">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin" /> Loading devices...
            </div>
            <div v-else>
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-slate-600 dark:text-white/60">
                  {{ createForm.deviceIds.length }} selected 
                  <span class="text-slate-400 dark:text-white/40">({{ filteredDevicesForCreate.length }} {{ createForm.profileType.startsWith('TVOS') ? 'tvOS' : 'iOS/Mac' }} devices available)</span>
                </span>
                <UButton size="xs" color="gray" variant="ghost" @click="selectAllDevices">Select All</UButton>
              </div>
              <div class="space-y-1 max-h-48 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-lg p-2">
                <label v-for="device in filteredDevicesForCreate" :key="device.id" class="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" :value="device.id" v-model="createForm.deviceIds" class="rounded" />
                  <span class="text-sm truncate">{{ device.name }}</span>
                  <span class="text-xs text-slate-400 dark:text-white/40 font-mono">{{ device.udid.slice(0, 8) }}...</span>
                  <UBadge color="gray" variant="soft" size="xs">{{ device.deviceClass }}</UBadge>
                </label>
                <p v-if="filteredDevicesForCreate.length === 0" class="text-sm text-slate-500 dark:text-white/50 p-2">
                  No {{ createForm.profileType.startsWith('TVOS') ? 'Apple TV' : 'iOS (iPhone/iPad) or Mac' }} devices found
                </p>
              </div>
            </div>
          </UFormGroup>

          <div class="flex items-center gap-3 pt-2">
            <UButton type="submit" color="green" :loading="creating" icon="i-heroicons-plus">
              Create & Download Profile
            </UButton>
            <p v-if="createError" class="text-sm text-red-400">{{ createError }}</p>
            <p v-if="createSuccess" class="text-sm text-green-400">{{ createSuccess }}</p>
          </div>
        </form>
      </div>
    </UCard>

    <!-- Apple Profiles List -->
    <UCard v-if="appleConnected" class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cloud" />
            <span class="font-semibold">Profiles from Apple Developer Portal</span>
            <UBadge color="gray" variant="soft">{{ filteredProfiles.length }}</UBadge>
          </div>
          <div class="flex items-center gap-2">
            <USelect v-model="filterType" :options="filterOptions" size="sm" />
            <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="refreshing" @click="refreshProfiles" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>

      <div v-else-if="fetchError" class="text-center py-8">
        <p class="text-red-400 mb-2">{{ error }}</p>
        <UButton color="gray" variant="soft" @click="refreshProfiles">Try Again</UButton>
      </div>

      <div v-else-if="filteredProfiles.length === 0" class="text-center py-8 text-slate-500 dark:text-white/50">
        <UIcon name="i-heroicons-document-text" class="text-4xl mb-2" />
        <p>{{ filterType !== 'ALL' ? 'No profiles match the filter' : 'No profiles found' }}</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-medium truncate">{{ profile.name }}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <UBadge :color="getStateColor(profile.profileState)" variant="soft" size="xs">
                  {{ profile.profileState }}
                </UBadge>
                <UBadge :color="getTypeColor(profile.profileType)" variant="soft" size="xs">
                  {{ formatProfileType(profile.profileType) }}
                </UBadge>
                <UBadge color="blue" variant="soft" size="xs">{{ profile.platform }}</UBadge>
              </div>
              <p class="text-xs text-slate-500 dark:text-white/40 mt-1">
                UUID: {{ profile.uuid }} • Expires: {{ new Date(profile.expirationDate).toLocaleDateString() }}
              </p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
              <UButton
                v-if="profile.certificateCount === 0"
                color="red"
                variant="soft"
                icon="i-heroicons-exclamation-triangle"
                size="sm"
                @click="openAssignCertificate(profile)"
              >
                Assign Cert
              </UButton>
              <!-- Regenerate button only for Ad Hoc and Development profiles -->
              <UButton
                v-if="canRegenerate(profile.profileType)"
                color="orange"
                variant="soft"
                icon="i-heroicons-arrow-path"
                size="sm"
                :loading="regenerating === profile.id"
                @click="handleRegenerate(profile.id, profile.name)"
              >
                Update & Activate
              </UButton>
              <UButton
                color="green"
                variant="soft"
                icon="i-heroicons-cloud-arrow-down"
                size="sm"
                :loading="downloading === profile.id"
                @click="handleDownload(profile.id)"
              >
                Download
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Regeneration feedback -->
      <div v-if="regenerateSuccess || regenerateError" class="mt-4 p-3 rounded-lg" :class="regenerateError ? 'bg-red-500/10' : 'bg-green-500/10'">
        <p v-if="regenerateSuccess" class="text-sm text-green-400">{{ regenerateSuccess }}</p>
        <p v-if="regenerateError" class="text-sm text-red-400">{{ regenerateError }}</p>
      </div>
    </UCard>

    <!-- Link to local profiles -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-text" />
            <span class="card-title">Local Provisioning Profiles</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-white/60">Upload .mobileprovision files manually, or download them from Apple Developer Portal.</p>
        
        <form class="grid md:grid-cols-4 gap-4" @submit.prevent="onLocalUpload">
          <UFormGroup label="Platform">
            <USelect v-model="localPlatform" :options="localPlatformOptions" />
          </UFormGroup>
          <UFormGroup label="Name (optional)">
            <UInput v-model="localName" />
          </UFormGroup>
          <UFormGroup label="Profile (.mobileprovision)">
            <input ref="localProfileRef" type="file" accept=".mobileprovision" class="block w-full text-sm" />
          </UFormGroup>
          <div class="flex items-end">
            <UButton type="submit" color="red" :loading="localUploading">Upload</UButton>
          </div>
        </form>

        <p v-if="localUploadMessage" :class="localUploadError ? 'text-red-400' : 'text-green-400'" class="text-sm">{{ localUploadMessage }}</p>

        <UDivider />

        <UTable :rows="localRows" :columns="localColumns">
          <template #active-data="{ row }">
            <UBadge :color="row.active ? 'green' : 'gray'">{{ row.active ? 'Active' : 'Inactive' }}</UBadge>
          </template>
          <template #expiresAt-data="{ row }">
            <span :class="isLocalExpired(row.expiresAt) ? 'text-red-400' : ''">
              {{ row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '-' }}
            </span>
          </template>
          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton size="xs" color="white" variant="soft" @click="localActivate(row.id)" :disabled="row.active">Activate</UButton>
              <UButton size="xs" color="red" variant="soft" @click="localRemove(row.id)">Delete</UButton>
            </div>
          </template>
        </UTable>

        <p v-if="!localRows?.length" class="text-center text-slate-500 dark:text-white/50 py-4">No profiles uploaded yet</p>
      </div>
    </UCard>
    <!-- Assign Certificate Modal -->
    <UModal v-model="showAssignCertModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Assign Certificate
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="showAssignCertModal = false" />
          </div>
        </template>
        
        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Select a certificate to assign to profile <strong>{{ assignCertProfile?.name }}</strong>.
            This will regenerate the profile.
          </p>

          <div v-if="loadingCerts" class="py-2">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin" /> Loading certificates...
          </div>
          <div v-else class="space-y-2 max-h-60 overflow-y-auto">
            <label
              v-for="cert in appleCertificates"
              :key="cert.id"
              class="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <input type="radio" :value="cert.id" v-model="assignCertSelectedId" class="rounded-full" />
              <div class="flex flex-col">
                <span class="text-sm font-medium">
                  {{ cert.displayName || cert.name }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ cert.certificateType }}
                  <span v-if="cert.expirationDate">
                    • Expires {{ new Date(cert.expirationDate).toLocaleDateString() }}
                  </span>
                </span>
              </div>
            </label>
            <p v-if="appleCertificates.length === 0" class="text-sm text-slate-500">No available certificates found.</p>
          </div>

          <p v-if="assignCertError" class="text-sm text-red-500">{{ assignCertError }}</p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showAssignCertModal = false">Cancel</UButton>
            <UButton 
              color="primary" 
              :loading="assigningCert" 
              :disabled="!assignCertSelectedId"
              @click="handleAssignCertificate"
            >
              Assign & Regenerate
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Apple Profiles', layout: 'default' })

interface AppleProfile {
  id: string
  name: string
  platform: string
  profileType: string
  profileState: string
  uuid: string
  createdDate: string
  expirationDate: string
  certificateCount: number
}

interface AppleCert {
  id: string
  name: string
  displayName: string | null
  certificateType: string
  platform?: string | null
  expirationDate?: string | null
}

interface AppleDevice {
  id: string
  name: string
  udid: string
  platform: string
  deviceClass: string
}

interface BundleId {
  id: string
  identifier: string
  name: string
  platform: string
}

const refreshing = ref(false)
const filterType = ref('ALL')
const downloading = ref<string | null>(null)
const regenerating = ref<string | null>(null)
const regenerateSuccess = ref('')
const regenerateError = ref('')

// Create form state
const showCreateForm = ref(false)
const creating = ref(false)
const createError = ref('')
const createSuccess = ref('')
const loadingBundleIds = ref(false)
const loadingCerts = ref(false)
const loadingDevices = ref(false)
const bundleIds = ref<BundleId[]>([])
const appleCertificates = ref<AppleCert[]>([])
const appleDevices = ref<AppleDevice[]>([])

const createForm = reactive({
  name: '',
  profileType: 'IOS_APP_ADHOC',
  bundleIdId: '',
  certificateIds: [] as string[],
  deviceIds: [] as string[]
})

const profileTypeOptions = [
  { label: 'iOS Development', value: 'IOS_APP_DEVELOPMENT' },
  { label: 'iOS Ad Hoc', value: 'IOS_APP_ADHOC' },
  { label: 'iOS App Store', value: 'IOS_APP_STORE' },
  { label: 'tvOS Development', value: 'TVOS_APP_DEVELOPMENT' },
  { label: 'tvOS Ad Hoc', value: 'TVOS_APP_ADHOC' },
  { label: 'tvOS App Store', value: 'TVOS_APP_STORE' }
]

const filterOptions = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Development', value: 'DEVELOPMENT' },
  { label: 'Ad Hoc', value: 'ADHOC' },
  { label: 'App Store', value: 'STORE' },
  { label: 'iOS Only', value: 'IOS' },
  { label: 'tvOS Only', value: 'TVOS' }
]

const bundleIdOptions = computed(() => 
  bundleIds.value.map(b => ({
    label: `${b.name} (${b.identifier})`,
    value: b.id
  }))
)

// Filter devices based on selected profile type
// - tvOS profiles: only Apple TV devices
// - iOS profiles: iOS devices (iPhone/iPad) AND macOS devices, exclude Apple TV
const filteredDevicesForCreate = computed(() => {
  const isTvOS = createForm.profileType.startsWith('TVOS')
  return appleDevices.value.filter(d => {
    if (isTvOS) {
      return d.deviceClass === 'APPLE_TV'
    } else {
      return (d.platform === 'IOS' || d.platform === 'MAC_OS') && d.deviceClass !== 'APPLE_TV'
    }
  })
})

const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

// Fetch profiles - SSR compatible
const { data: profiles, pending: loading, error: fetchError, refresh: refreshProfilesData } = await useFetch<AppleProfile[]>('/api/apple/profiles', {
  immediate: true,
  default: () => []
})
const error = computed(() => fetchError.value?.data?.message || (fetchError.value ? 'Failed to load profiles' : ''))

const filteredProfiles = computed(() => {
  const profileList = profiles.value || []
  if (filterType.value === 'ALL') return profileList
  return profileList.filter(p => {
    if (filterType.value === 'DEVELOPMENT') return p.profileType.includes('DEVELOPMENT')
    if (filterType.value === 'ADHOC') return p.profileType.includes('ADHOC')
    if (filterType.value === 'STORE') return p.profileType.includes('STORE')
    if (filterType.value === 'IOS') return p.platform === 'IOS'
    if (filterType.value === 'TVOS') return p.platform === 'TVOS'
    return true
  })
})

function getStateColor(state: string) {
  switch (state) {
    case 'ACTIVE': return 'green'
    case 'INVALID': return 'red'
    default: return 'gray'
  }
}

function getTypeColor(type: string) {
  if (type.includes('STORE')) return 'purple'
  if (type.includes('ADHOC')) return 'orange'
  return 'blue'
}

function formatProfileType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

function canRegenerate(profileType: string): boolean {
  // Only Ad Hoc and Development profiles have device lists that can be updated
  return profileType.includes('ADHOC') || profileType.includes('DEVELOPMENT')
}

async function handleRegenerate(profileId: string, profileName: string) {
  regenerateError.value = ''
  regenerateSuccess.value = ''
  regenerating.value = profileId

  try {
    const result = await $fetch<{ success: boolean; devicesIncluded: number; profile: any }>(`/api/apple/profiles/${profileId}/regenerate`, {
      method: 'POST',
      body: { activateAfter: true }
    })
    regenerateSuccess.value = `"${profileName}" updated with ${result.devicesIncluded} devices and set as active signing profile!`
    
    // Refresh both lists
    await refreshProfiles()
    await refreshLocal()
  } catch (e: any) {
    regenerateError.value = e?.data?.message || 'Failed to regenerate profile'
  } finally {
    regenerating.value = null
  }
}

async function refreshProfiles() {
  refreshing.value = true
  await refreshProfilesData()
  refreshing.value = false
}

async function handleDownload(profileId: string) {
  downloading.value = profileId
  try {
    await $fetch(`/api/apple/profiles/${profileId}/download`, { method: 'POST' })
    alert('Profile downloaded and saved locally!')
    await refreshLocal()
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to download profile')
  } finally {
    downloading.value = null
  }
}

async function loadCreateFormData() {
  if (!appleConnected.value) return

  loadingBundleIds.value = true
  loadingCerts.value = true
  loadingDevices.value = true

  try {
    const [bundleIdsData, certsData, devicesData] = await Promise.all([
      $fetch<BundleId[]>('/api/apple/bundleids'),
      $fetch<AppleCert[]>('/api/apple/certificates'),
      $fetch<AppleDevice[]>('/api/apple/devices')
    ])
    bundleIds.value = bundleIdsData
    appleCertificates.value = certsData
    appleDevices.value = devicesData
  } catch (e: any) {
    console.error('Failed to load create form data:', e)
  } finally {
    loadingBundleIds.value = false
    loadingCerts.value = false
    loadingDevices.value = false
  }
}

function selectAllDevices() {
  // Only select devices that match the current profile type
  createForm.deviceIds = filteredDevicesForCreate.value.map(d => d.id)
}

// Clear device selection when profile type changes (switching between iOS and tvOS)
watch(() => createForm.profileType, () => {
  createForm.deviceIds = []
})

async function handleCreate() {
  createError.value = ''
  createSuccess.value = ''

  if (!createForm.name || !createForm.bundleIdId || createForm.certificateIds.length === 0 || createForm.deviceIds.length === 0) {
    createError.value = 'Please fill in all required fields'
    return
  }

  creating.value = true
  try {
    await $fetch('/api/apple/profiles/create', {
      method: 'POST',
      body: {
        name: createForm.name.trim(),
        bundleIdId: createForm.bundleIdId,
        certificateIds: createForm.certificateIds,
        deviceIds: createForm.deviceIds,
        profileType: createForm.profileType
      }
    })
    createSuccess.value = 'Profile created and downloaded successfully!'
    // Reset form
    createForm.name = ''
    createForm.certificateIds = []
    createForm.deviceIds = []
    showCreateForm.value = false
    await refreshProfiles()
    await refreshLocal()
  } catch (e: any) {
    createError.value = e?.data?.message || 'Failed to create profile'
  } finally {
    creating.value = false
  }
}

// Load create form data when form is opened
watch(showCreateForm, (show) => {
  if (show && bundleIds.value.length === 0) {
    loadCreateFormData()
  }
})

// === LOCAL PROFILES LOGIC ===

type LocalProfRow = { id: string; name?: string | null; platform: 'IOS' | 'TVOS'; uuid?: string | null; expiresAt?: string | null; createdAt: string; active: boolean }
const localColumns = [
  { key: 'name', label: 'Name' },
  { key: 'platform', label: 'Platform' },
  { key: 'uuid', label: 'UUID' },
  { key: 'expiresAt', label: 'Expires' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const localPlatform = ref<'IOS' | 'TVOS'>('IOS')
const localName = ref('')
const localPlatformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]
const localProfileRef = ref<HTMLInputElement | null>(null)
const localUploading = ref(false)
const localUploadMessage = ref('')
const localUploadError = ref(false)

const { data: localRows, refresh: refreshLocal } = await useFetch<LocalProfRow[]>('/api/profile/profiles')

function isLocalExpired(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

async function onLocalUpload() {
  localUploadMessage.value = ''
  localUploadError.value = false
  localUploading.value = true
  
  try {
    const fd = new FormData()
    fd.set('platform', localPlatform.value)
    if (localName.value) fd.set('name', localName.value)
    const file = localProfileRef.value?.files?.[0]
    if (file) fd.set('profile', file)
    await $fetch('/api/profile/profiles', { method: 'POST', body: fd })
    localUploadMessage.value = 'Profile uploaded successfully'
    localName.value = ''
    if (localProfileRef.value) localProfileRef.value.value = ''
    await refreshLocal()
  } catch (e: any) {
    localUploadMessage.value = e?.data?.message || 'Failed to upload profile'
    localUploadError.value = true
  } finally {
    localUploading.value = false
  }
}

async function localActivate(id: string) {
  await $fetch(`/api/profile/profiles/${id}/activate`, { method: 'POST' })
  await refreshLocal()
}

async function localRemove(id: string) {
  if (!confirm('Are you sure you want to delete this profile?')) return
  await $fetch(`/api/profile/profiles/${id}`, { method: 'DELETE' })
  await refreshLocal()
}

const showAssignCertModal = ref(false)
const assignCertProfile = ref<AppleProfile | null>(null)
const assignCertSelectedId = ref<string>('')
const assigningCert = ref(false)
const assignCertError = ref('')

function openAssignCertificate(profile: AppleProfile) {
  assignCertProfile.value = profile
  assignCertSelectedId.value = ''
  assignCertError.value = ''
  showAssignCertModal.value = true
  
  if (appleCertificates.value.length === 0) {
    loadCreateFormData() // Re-use this to fetch certs if not already loaded
  }
}

async function handleAssignCertificate() {
  if (!assignCertProfile.value || !assignCertSelectedId.value) return
  
  assigningCert.value = true
  assignCertError.value = ''
  
  try {
    const result = await $fetch<{ success: boolean; devicesIncluded: number }>(`/api/apple/profiles/${assignCertProfile.value.id}/regenerate`, {
      method: 'POST',
      body: { 
        activateAfter: true,
        certificateIds: [assignCertSelectedId.value]
      }
    })
    
    showAssignCertModal.value = false
    alert(`Profile updated successfully! Associated with new certificate.`)
    await refreshProfiles()
    await refreshLocal()
  } catch (e: any) {
    assignCertError.value = e?.data?.message || 'Failed to assign certificate'
  } finally {
    assigningCert.value = false
  }
}
</script>

