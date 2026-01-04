<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Back Button -->
    <div>
      <UButton to="/profile/user-database" color="gray" variant="ghost" icon="i-heroicons-arrow-left">
        Back to User Database
      </UButton>
    </div>

    <!-- Header -->
    <div>
      <h1 class="page-title">Import Devices from Apple</h1>
      <p class="text-sm text-slate-600 dark:text-white/60 mt-1">
        Map your existing Apple Developer devices to users in your database
      </p>
    </div>

    <!-- Connection Required -->
    <UAlert
      v-if="!appleConnected"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      title="Apple Developer Connection Required"
    >
      <template #description>
        <p class="mb-2">You need to connect your Apple Developer account to import devices.</p>
        <UButton to="/profile/apple-developer" size="sm" color="red" variant="solid">
          Connect Now
        </UButton>
      </template>
    </UAlert>

    <!-- Loading State -->
    <div v-else-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-slate-400 mb-4" />
        <p class="text-slate-600 dark:text-white/60">Loading devices from Apple...</p>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="fetchError"
      icon="i-heroicons-exclamation-circle"
      color="red"
      variant="soft"
      :title="fetchError"
    />

    <!-- No Devices -->
    <div v-else-if="appleDevices.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-device-phone-mobile" class="text-5xl text-slate-400 mb-4" />
      <p class="text-lg text-slate-600 dark:text-white/60">No devices found in your Apple Developer account</p>
    </div>

    <!-- Import Wizard -->
    <template v-else>
      <!-- Progress -->
      <UCard class="glass">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">{{ appleDevices.length }} devices found</p>
            <p class="text-sm text-slate-600 dark:text-white/60">
              {{ mappedCount }} mapped • {{ skippedCount }} skipped • {{ unmappedCount }} remaining
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="unmappedCount > 0"
              color="gray"
              variant="soft"
              size="sm"
              @click="skipAllUnmapped"
            >
              Skip All Unmapped
            </UButton>
            <UButton
              color="green"
              :disabled="mappedCount === 0"
              :loading="importing"
              icon="i-heroicons-cloud-arrow-up"
              @click="handleImport"
            >
              Import {{ mappedCount }} Device(s)
            </UButton>
          </div>
        </div>
        <p v-if="importResult" class="mt-3 text-sm" :class="importResult.success ? 'text-green-400' : 'text-red-400'">
          {{ importResult.message }}
        </p>
      </UCard>

      <!-- Quick Actions -->
      <UCard class="glass">
        <div class="flex flex-wrap items-center gap-4">
          <span class="text-sm text-slate-600 dark:text-white/60">Quick Actions:</span>
          <UButton
            color="blue"
            variant="soft"
            size="sm"
            @click="autoMapByName"
          >
            Auto-map by device name
          </UButton>
          <UButton
            color="gray"
            variant="soft"
            size="sm"
            @click="clearAllMappings"
          >
            Clear All Mappings
          </UButton>
        </div>
      </UCard>

      <!-- Device List -->
      <div class="space-y-4">
        <UCard
          v-for="device in appleDevices"
          :key="device.udid"
          class="glass"
          :class="{
            'ring-2 ring-green-500/50': mappings[device.udid]?.discordName && !mappings[device.udid]?.skip,
            'opacity-50': mappings[device.udid]?.skip
          }"
        >
          <div class="space-y-4">
            <!-- Device Info -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-white/10">
                  <UIcon :name="getDeviceIcon(device.deviceClass)" class="text-xl" />
                </div>
                <div>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ device.name }}</p>
                  <p class="font-mono text-xs text-slate-500 dark:text-white/40">{{ device.udid }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <UBadge color="blue" variant="soft" size="xs">{{ device.platform }}</UBadge>
                    <span v-if="device.model" class="text-xs text-slate-500 dark:text-white/40">{{ device.model }}</span>
                    <span v-if="device.addedDate" class="text-xs text-slate-500 dark:text-white/40">
                      Added {{ new Date(device.addedDate).toLocaleDateString() }}
                    </span>
                  </div>
                </div>
              </div>
              <UButton
                v-if="mappings[device.udid]?.skip"
                color="gray"
                variant="ghost"
                size="sm"
                @click="unskipDevice(device.udid)"
              >
                Unskip
              </UButton>
            </div>

            <!-- Mapping Options -->
            <div v-if="!mappings[device.udid]?.skip" class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <URadio
                  v-model="mappings[device.udid].mode"
                  value="new"
                  label="Create new user"
                />
                <URadio
                  v-if="existingUsers.length > 0"
                  v-model="mappings[device.udid].mode"
                  value="existing"
                  label="Assign to existing"
                />
                <URadio
                  v-model="mappings[device.udid].mode"
                  value="skip"
                  label="Skip this device"
                  @change="skipDevice(device.udid)"
                />
              </div>

              <!-- New User Input -->
              <div v-if="mappings[device.udid].mode === 'new'" class="pl-6 space-y-3">
                <UFormGroup label="Discord Name or Search Discord User">
                  <div class="flex gap-2">
                    <UInput
                      v-model="mappings[device.udid].discordName"
                      placeholder="Enter Discord name or search..."
                      :class="{ 'ring-2 ring-green-500': mappings[device.udid].discordName }"
                      class="flex-1"
                      @keyup.enter="searchDiscordForImport(device.udid)"
                    />
                    <UButton
                      color="blue"
                      variant="soft"
                      icon="i-heroicons-magnifying-glass"
                      :loading="discordSearchLoading[device.udid]"
                      @click="searchDiscordForImport(device.udid)"
                    >
                      Search
                    </UButton>
                  </div>
                </UFormGroup>
                <UFormGroup v-if="discordUserOptions[device.udid]?.length > 0" label="Select Discord User">
                  <USelectMenu
                    :model-value="mappings[device.udid].discordId"
                    :options="discordUserOptions[device.udid]"
                    value-attribute="id"
                    option-attribute="label"
                    placeholder="Choose a Discord user"
                    @update:model-value="selectDiscordUserForImport(device.udid, $event)"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <img
                          v-if="option.avatar"
                          :src="option.avatar"
                          :alt="option.username"
                          class="w-6 h-6 rounded-full"
                        />
                        <span>{{ option.label }}</span>
                      </div>
                    </template>
                  </USelectMenu>
                </UFormGroup>
              </div>

              <!-- Existing User Select -->
              <div v-else-if="mappings[device.udid].mode === 'existing'" class="pl-6">
                <UFormGroup label="Select User">
                  <USelectMenu
                    v-model="mappings[device.udid].discordName"
                    :options="existingUserOptions"
                    placeholder="Select a user..."
                    searchable
                    searchable-placeholder="Search users..."
                  />
                </UFormGroup>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Import from Apple', layout: 'default' })

interface AppleDevice {
  id: string
  name: string
  udid: string
  platform: string
  deviceClass: string
  status: string
  model?: string
  addedDate?: string
}

interface DeviceMapping {
  mode: 'new' | 'existing' | 'skip'
  discordName: string
  discordId?: string | null
  skip: boolean
}

interface RegisteredUser {
  id: string
  discordName: string
}

// Apple connection status
const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

// Fetch Apple devices
const { data: appleDevicesData, pending: loading, error: fetchErrorObj } = await useFetch<AppleDevice[]>('/api/apple/devices', {
  immediate: appleConnected.value,
  default: () => []
})
const appleDevices = computed(() => appleDevicesData.value || [])
const fetchError = computed(() => fetchErrorObj.value?.data?.message || (fetchErrorObj.value ? 'Failed to load devices' : ''))

// Fetch existing users
const { data: existingUsersData } = await useFetch<RegisteredUser[]>('/api/registered-users', {
  default: () => []
})
const existingUsers = computed(() => existingUsersData.value || [])
const existingUserOptions = computed(() => existingUsers.value.map(u => u.discordName))

// Initialize mappings
const mappings = reactive<Record<string, DeviceMapping>>({})

watch(appleDevices, (devices) => {
  for (const device of devices) {
    if (!mappings[device.udid]) {
      mappings[device.udid] = {
        mode: 'new',
        discordName: '',
        discordId: null,
        skip: false
      }
    }
  }
}, { immediate: true })

// Discord search for import
const discordSearchLoading = ref<Record<string, boolean>>({})
const discordUserOptions = ref<Record<string, Array<{
  id: string
  label: string
  username: string
  avatar?: string | null
}>>>({})

async function searchDiscordForImport(udid: string) {
  const query = mappings[udid].discordName.trim()
  if (!query) {
    return
  }

  discordSearchLoading.value[udid] = true
  try {
    const results = await $fetch<Array<{
      id: string
      username: string
      nickname?: string
      avatar?: string | null
      source: 'database' | 'discord_api'
    }>>('/api/admin/discord-users/search', {
      query: { q: query }
    })

    discordUserOptions.value[udid] = results.map((r) => ({
      id: r.id,
      label: `${r.username}${r.nickname ? ` (${r.nickname})` : ''}${r.source === 'discord_api' ? ' [Discord API]' : ''}`,
      username: r.username,
      avatar: r.avatar
    }))
  } catch (e: any) {
    console.error(e)
    useToast().add({ title: 'Search failed', description: e?.data?.message || 'Failed to search Discord users', color: 'red' })
  } finally {
    discordSearchLoading.value[udid] = false
  }
}

function selectDiscordUserForImport(udid: string, discordId: string | null) {
  mappings[udid].discordId = discordId
  if (discordId) {
    const selected = discordUserOptions.value[udid]?.find(u => u.id === discordId)
    if (selected) {
      mappings[udid].discordName = selected.username
    }
  }
}

// Statistics
const mappedCount = computed(() => {
  return Object.values(mappings).filter(m => m.discordName && !m.skip).length
})
const skippedCount = computed(() => {
  return Object.values(mappings).filter(m => m.skip).length
})
const unmappedCount = computed(() => {
  return appleDevices.value.length - mappedCount.value - skippedCount.value
})

// Import state
const importing = ref(false)
const importResult = ref<{ success: boolean; message: string } | null>(null)

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

function skipDevice(udid: string) {
  mappings[udid].skip = true
  mappings[udid].discordName = ''
}

function unskipDevice(udid: string) {
  mappings[udid].skip = false
  mappings[udid].mode = 'new'
}

function skipAllUnmapped() {
  for (const udid of Object.keys(mappings)) {
    if (!mappings[udid].discordName && !mappings[udid].skip) {
      mappings[udid].skip = true
    }
  }
}

function clearAllMappings() {
  for (const udid of Object.keys(mappings)) {
    mappings[udid] = {
      mode: 'new',
      discordName: '',
      discordId: null,
      skip: false
    }
  }
  discordUserOptions.value = {}
}

function autoMapByName() {
  // Extract nicknames from device names and pre-fill mappings
  // Device names often follow pattern: "nickname's iPhone" or "nickname iPhone"
  
  for (const device of appleDevices.value) {
    if (mappings[device.udid].skip) continue
    
    // Extract the first word as potential nickname
    // Handle patterns like "john's iPhone", "john iPhone", "John's iPad"
    let nickname = device.name.split(/[\s'']/)[0].toLowerCase()
    
    // Skip generic names that aren't real nicknames
    const genericNames = ['iphone', 'ipad', 'mac', 'macbook', 'apple', 'device', 'my', 'the']
    if (genericNames.includes(nickname) || nickname.length < 2) {
      continue
    }
    
    // Capitalize first letter
    nickname = nickname.charAt(0).toUpperCase() + nickname.slice(1)
    
    // Check if this nickname matches an existing user in the database
    const existingUser = existingUsers.value.find(
      u => u.discordName.toLowerCase() === nickname.toLowerCase()
    )
    
    if (existingUser) {
      // Assign to existing user
      mappings[device.udid].mode = 'existing'
      mappings[device.udid].discordName = existingUser.discordName
    } else {
      // Create new user - use the extracted nickname
      mappings[device.udid].mode = 'new'
      mappings[device.udid].discordName = nickname
    }
  }
}

async function handleImport() {
  importing.value = true
  importResult.value = null

  try {
    // Build the mappings payload
    const importMappings = appleDevices.value.map(device => ({
      udid: device.udid,
      name: device.name,
      platform: device.platform,
      discordName: mappings[device.udid].discordName,
      discordId: mappings[device.udid].discordId || undefined,
      skip: mappings[device.udid].skip
    }))

    const result = await $fetch<{ imported: number; users: any[]; skipped: number }>('/api/registered-users/import-from-apple', {
      method: 'POST',
      body: { mappings: importMappings }
    })

    importResult.value = {
      success: true,
      message: `Successfully imported ${result.imported} device(s) for ${result.users.length} user(s). ${result.skipped} skipped.`
    }

    // Redirect to user database after short delay
    setTimeout(() => {
      navigateTo('/profile/user-database')
    }, 2000)
  } catch (e: any) {
    importResult.value = {
      success: false,
      message: e?.data?.message || 'Failed to import devices'
    }
  } finally {
    importing.value = false
  }
}
</script>

