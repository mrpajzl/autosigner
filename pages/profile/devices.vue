<template>
  <div class="space-y-6">
    <!-- Connection Required Alert -->
    <UAlert
      v-if="!appleConnected"
      icon="i-heroicons-exclamation-triangle"
      color="yellow"
      variant="soft"
      title="Apple Developer Connection Required"
    >
      <template #description>
        <p class="mb-2">You need to connect your Apple Developer account to manage devices.</p>
        <UButton to="/profile/apple-developer" size="sm" color="yellow" variant="solid">
          Connect Now
        </UButton>
      </template>
    </UAlert>

    <!-- Register New Device -->
    <UCard v-if="appleConnected" class="glass">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-plus-circle" />
          <span class="font-semibold">Register New Device</span>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleRegister">
        <div class="grid md:grid-cols-3 gap-4">
          <UFormGroup label="Device UDID" required>
            <UInput v-model="newDevice.udid" placeholder="00000000-000000000000000" class="font-mono" />
          </UFormGroup>
          <UFormGroup label="Device Name" required>
            <UInput v-model="newDevice.name" placeholder="John's iPhone 15" />
          </UFormGroup>
          <UFormGroup label="Platform">
            <USelect v-model="newDevice.platform" :options="platformOptions" />
          </UFormGroup>
        </div>
        
        <UAlert
          icon="i-heroicons-light-bulb"
          color="blue"
          variant="soft"
          title="How to find UDID"
        >
          <template #description>
            <p class="text-sm">
              Connect device to Mac → Open Finder → Select device → Click on device info to reveal UDID.
              Or use <a href="https://udid.io" target="_blank" class="underline">udid.io</a> on the device.
            </p>
          </template>
        </UAlert>

        <div class="flex items-center gap-3">
          <UButton type="submit" color="green" :loading="registering" icon="i-heroicons-plus">
            Register Device
          </UButton>
          <p v-if="registerError" class="text-sm text-red-400">{{ registerError }}</p>
          <p v-if="registerSuccess" class="text-sm text-green-400">{{ registerSuccess }}</p>
        </div>
      </form>
    </UCard>

    <!-- Update Profiles After Device Registration -->
    <UCard v-if="showUpdateProfiles && appleProfiles.length > 0" class="glass border-2 border-green-500/50">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="text-green-400" />
            <span class="font-semibold text-green-400">Update Provisioning Profiles</span>
          </div>
          <UButton icon="i-heroicons-x-mark" color="gray" variant="ghost" size="xs" @click="showUpdateProfiles = false" />
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-white/70">
          New device registered! Select profiles to regenerate with all current devices and set as your active signing profile:
        </p>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="profile in appleProfiles"
            :key="profile.id"
            class="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-4"
          >
            <div class="min-w-0">
              <p class="font-medium truncate">{{ profile.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <UBadge :color="getTypeColor(profile.profileType)" variant="soft" size="xs">
                  {{ formatProfileType(profile.profileType) }}
                </UBadge>
                <UBadge color="blue" variant="soft" size="xs">{{ profile.platform }}</UBadge>
              </div>
            </div>
            <UButton
              color="green"
              variant="soft"
              size="sm"
              icon="i-heroicons-arrow-path"
              :loading="regeneratingProfile === profile.id"
              @click="handleRegenerateProfile(profile.id, profile.name)"
            >
              Update & Activate
            </UButton>
          </div>
        </div>

        <p v-if="regenerateSuccess" class="text-sm text-green-400">{{ regenerateSuccess }}</p>
        <p v-if="regenerateError" class="text-sm text-red-400">{{ regenerateError }}</p>
      </div>
    </UCard>

    <!-- Devices List -->
    <UCard v-if="appleConnected" class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-device-phone-mobile" />
            <span class="font-semibold">Registered Devices</span>
            <UBadge color="gray" variant="soft">{{ filteredDevices.length }}</UBadge>
          </div>
          <div class="flex items-center gap-2">
            <UInput v-model="search" placeholder="Search..." icon="i-heroicons-magnifying-glass" size="sm" />
            <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="refreshing" @click="refreshDevices" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>

      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-400 mb-2">{{ error }}</p>
        <UButton color="gray" variant="soft" @click="refreshDevices">Try Again</UButton>
      </div>

      <div v-else-if="filteredDevices.length === 0" class="text-center py-8 text-slate-500 dark:text-white/50">
        <UIcon name="i-heroicons-device-phone-mobile" class="text-4xl mb-2" />
        <p>{{ search ? 'No devices match your search' : 'No devices registered yet' }}</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="device in filteredDevices"
          :key="device.id"
          class="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3 min-w-0">
              <div class="p-2 rounded-lg bg-white/10">
                <UIcon :name="getDeviceIcon(device.deviceClass)" class="text-lg" />
              </div>
              <div class="min-w-0">
                <p class="font-medium truncate">{{ device.name }}</p>
                <p class="font-mono text-xs text-slate-500 dark:text-white/50 truncate">{{ device.udid }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge :color="device.status === 'ENABLED' ? 'green' : 'gray'" variant="soft" size="xs">
                    {{ device.status }}
                  </UBadge>
                  <UBadge color="blue" variant="soft" size="xs">{{ device.platform }}</UBadge>
                  <span v-if="device.model" class="text-xs text-slate-500 dark:text-white/40">{{ device.model }}</span>
                </div>
              </div>
            </div>
            <div class="text-xs text-slate-500 dark:text-white/40 text-right whitespace-nowrap">
              {{ device.addedDate ? new Date(device.addedDate).toLocaleDateString() : '' }}
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Devices', layout: 'default' })

interface Device {
  id: string
  name: string
  udid: string
  platform: string
  deviceClass: string
  status: string
  model?: string
  addedDate?: string
}

interface AppleProfile {
  id: string
  name: string
  platform: string
  profileType: string
  profileState: string
}

const search = ref('')
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const devices = ref<Device[]>([])

const registering = ref(false)
const registerError = ref('')
const registerSuccess = ref('')
const newDevice = reactive({
  udid: '',
  name: '',
  platform: 'IOS'
})

// Profile update state
const showUpdateProfiles = ref(false)
const appleProfiles = ref<AppleProfile[]>([])
const regeneratingProfile = ref<string | null>(null)
const regenerateSuccess = ref('')
const regenerateError = ref('')

const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'macOS', value: 'MAC_OS' }
]

const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

const filteredDevices = computed(() => {
  if (!search.value) return devices.value
  const s = search.value.toLowerCase()
  return devices.value.filter(d =>
    d.name.toLowerCase().includes(s) ||
    d.udid.toLowerCase().includes(s) ||
    d.model?.toLowerCase().includes(s)
  )
})

function getDeviceIcon(deviceClass: string) {
  switch (deviceClass) {
    case 'IPHONE': return 'i-heroicons-device-phone-mobile'
    case 'IPAD': return 'i-heroicons-device-tablet'
    case 'APPLE_TV': return 'i-heroicons-tv'
    case 'APPLE_WATCH': return 'i-heroicons-clock'
    case 'MAC': return 'i-heroicons-computer-desktop'
    default: return 'i-heroicons-device-phone-mobile'
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

async function fetchDevices() {
  if (!appleConnected.value) return
  
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<Device[]>('/api/apple/devices')
    devices.value = data
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to load devices'
  } finally {
    loading.value = false
  }
}

async function fetchAppleProfiles() {
  try {
    const data = await $fetch<AppleProfile[]>('/api/apple/profiles')
    // Filter to only show Ad Hoc and Development profiles (these use device lists)
    appleProfiles.value = data.filter(p => 
      p.profileType.includes('ADHOC') || p.profileType.includes('DEVELOPMENT')
    )
  } catch (e) {
    console.error('Failed to fetch profiles:', e)
  }
}

async function refreshDevices() {
  refreshing.value = true
  await fetchDevices()
  refreshing.value = false
}

async function handleRegister() {
  registerError.value = ''
  registerSuccess.value = ''
  showUpdateProfiles.value = false

  if (!newDevice.udid || !newDevice.name) {
    registerError.value = 'Please fill in UDID and device name'
    return
  }

  registering.value = true
  try {
    await $fetch('/api/apple/devices', {
      method: 'POST',
      body: {
        udid: newDevice.udid.trim(),
        name: newDevice.name.trim(),
        platform: newDevice.platform
      }
    })
    registerSuccess.value = 'Device registered successfully!'
    newDevice.udid = ''
    newDevice.name = ''
    await refreshDevices()
    
    // Fetch profiles and show update option
    await fetchAppleProfiles()
    if (appleProfiles.value.length > 0) {
      showUpdateProfiles.value = true
    }
  } catch (e: any) {
    registerError.value = e?.data?.message || 'Failed to register device'
  } finally {
    registering.value = false
  }
}

async function handleRegenerateProfile(profileId: string, profileName: string) {
  regenerateError.value = ''
  regenerateSuccess.value = ''
  regeneratingProfile.value = profileId

  try {
    const result = await $fetch<{ success: boolean; devicesIncluded: number; profile: any }>(`/api/apple/profiles/${profileId}/regenerate`, {
      method: 'POST',
      body: { activateAfter: true }
    })
    regenerateSuccess.value = `"${profileName}" updated with ${result.devicesIncluded} devices and set as active!`
    
    // Remove from list after successful update
    appleProfiles.value = appleProfiles.value.filter(p => p.id !== profileId)
    
    if (appleProfiles.value.length === 0) {
      setTimeout(() => {
        showUpdateProfiles.value = false
      }, 3000)
    }
  } catch (e: any) {
    regenerateError.value = e?.data?.message || 'Failed to regenerate profile'
  } finally {
    regeneratingProfile.value = null
  }
}

// Fetch on mount
onMounted(() => {
  if (appleConnected.value) {
    fetchDevices()
  } else {
    loading.value = false
  }
})
</script>

