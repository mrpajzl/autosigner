<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Connection Required Alert -->
    <UAlert
      v-if="!appleConnected"
      icon="i-heroicons-exclamation-triangle"
      color="yellow"
      variant="soft"
      title="Apple Developer Connection Recommended"
    >
      <template #description>
        <p class="mb-2">Connect your Apple Developer account to see which devices are already registered.</p>
        <UButton to="/profile/apple-developer" size="sm" color="yellow" variant="solid">
          Connect Now
        </UButton>
      </template>
    </UAlert>

    <!-- Header with Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">User Databaseasda</h1>
        <p class="text-sm text-slate-600 dark:text-white/60 mt-1">
          Manage your registered users and their devices for yearly device resets
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="appleConnected"
          to="/profile/users/import"
          color="blue"
          variant="soft"
          icon="i-heroicons-cloud-arrow-down"
        >
          Import from Apple
        </UButton>
        <UButton
          color="green"
          icon="i-heroicons-plus"
          @click="showAddUser = true"
        >
          Add User
        </UButton>
      </div>
    </div>

    <!-- Statistics Summary -->
    <div v-if="users.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-slate-900 dark:text-white">{{ users.length }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Users</div>
        </div>
      </UCard>
      <UCard class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-500">{{ totalDevices }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Total Devices</div>
        </div>
      </UCard>
      <UCard v-if="appleConnected" class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-500">{{ registeredInApple }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">In Apple</div>
        </div>
      </UCard>
      <UCard v-if="appleConnected" class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-orange-500">{{ notRegisteredInApple }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Not in Apple</div>
        </div>
      </UCard>
    </div>

    <!-- Bulk Import to Apple -->
    <UCard v-if="appleConnected && notRegisteredInApple > 0" class="glass border-2 border-orange-500/50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-arrow-up-on-square-stack" class="text-2xl text-orange-400" />
          <div>
            <p class="font-semibold text-slate-900 dark:text-white">{{ notRegisteredInApple }} devices not registered in Apple</p>
            <p class="text-sm text-slate-600 dark:text-white/60">Import all unregistered devices to your Apple Developer account</p>
          </div>
        </div>
        <UButton
          color="orange"
          :loading="importingAll"
          icon="i-heroicons-arrow-up-on-square"
          @click="handleImportAll"
        >
          Import All to Apple
        </UButton>
      </div>
      <p v-if="importAllResult" class="mt-3 text-sm" :class="importAllResult.success ? 'text-green-400' : 'text-red-400'">
        {{ importAllResult.message }}
      </p>
    </UCard>

    <!-- Search and Filter -->
    <UCard class="glass">
      <div class="flex items-center gap-4">
        <UInput
          v-model="search"
          placeholder="Search users or devices..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <UButton
          icon="i-heroicons-arrow-path"
          color="gray"
          variant="ghost"
          :loading="refreshing"
          @click="refreshUsers"
        />
      </div>
    </UCard>

    <!-- Users List -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-slate-400" />
    </div>

    <div v-else-if="filteredUsers.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-users" class="text-5xl text-slate-400 mb-4" />
      <p class="text-lg text-slate-600 dark:text-white/60">
        {{ search ? 'No users match your search' : 'No users yet' }}
      </p>
      <p v-if="!search" class="text-sm text-slate-500 dark:text-white/40 mt-2">
        Add users manually or import from your Apple Developer account
      </p>
    </div>

    <div v-else class="space-y-4">
      <UCard
        v-for="regUser in filteredUsers"
        :key="regUser.id"
        class="glass hover:ring-2 hover:ring-white/20 transition-all"
      >
        <div class="space-y-4">
          <!-- User Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <span class="text-white font-bold">{{ regUser.discordName.charAt(0).toUpperCase() }}</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-lg text-slate-900 dark:text-white">{{ regUser.discordName }}</h3>
                  <a
                    :href="getDiscordProfileUrl(regUser.discordName)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[#5865F2] hover:text-[#7289DA] transition-colors inline-flex"
                    :title="`Open Discord profile for ${regUser.discordName}`"
                  >
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </a>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-white/50">
                  <span>{{ regUser.deviceCount }} device{{ regUser.deviceCount === 1 ? '' : 's' }}</span>
                  <span v-if="regUser.registeredInAppleCount !== undefined">
                    • {{ regUser.registeredInAppleCount }}/{{ regUser.deviceCount }} in Apple
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                v-if="appleConnected && regUser.devices.some(d => !d.isRegisteredInApple)"
                color="orange"
                variant="soft"
                size="sm"
                icon="i-heroicons-arrow-up-on-square"
                :loading="importingUser === regUser.id"
                @click="handleImportUser(regUser)"
              >
                Import
              </UButton>
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-pencil"
                @click="editUser(regUser)"
              />
              <UButton
                color="red"
                variant="ghost"
                size="sm"
                icon="i-heroicons-trash"
                @click="confirmDeleteUser(regUser)"
              />
            </div>
          </div>

          <!-- Notes -->
          <p v-if="regUser.notes" class="text-sm text-slate-600 dark:text-white/60 italic">
            {{ regUser.notes }}
          </p>

          <!-- Devices List -->
          <div v-if="regUser.devices.length > 0" class="space-y-2">
            <div
              v-for="device in regUser.devices"
              :key="device.id"
              class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <UIcon :name="getDeviceIcon(device.platform)" class="text-lg text-slate-400" />
                <div class="min-w-0">
                  <p class="font-medium truncate text-slate-900 dark:text-white">{{ device.name }}</p>
                  <p class="font-mono text-xs text-slate-500 dark:text-white/40 truncate">{{ device.udid }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  v-if="device.isRegisteredInApple !== undefined"
                  :color="device.isRegisteredInApple ? 'green' : 'orange'"
                  variant="soft"
                  size="xs"
                >
                  {{ device.isRegisteredInApple ? 'In Apple' : 'Not in Apple' }}
                </UBadge>
                <UBadge color="blue" variant="soft" size="xs">{{ device.platform }}</UBadge>
                <UButton
                  color="gray"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-pencil-square"
                  @click="editDevice(regUser, device)"
                />
                <UButton
                  color="red"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  @click="confirmDeleteDevice(regUser, device)"
                />
              </div>
            </div>
          </div>

          <!-- Add Device Button -->
          <UButton
            color="gray"
            variant="soft"
            size="sm"
            icon="i-heroicons-plus"
            block
            @click="addDeviceToUser(regUser)"
          >
            Add Device
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Add/Edit User Modal -->
    <UModal v-model="showAddUser">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="editingUser ? 'i-heroicons-pencil' : 'i-heroicons-user-plus'" />
            <span class="font-semibold">{{ editingUser ? 'Edit User' : 'Add User' }}</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSaveUser">
          <UFormGroup label="Discord Name" required>
            <UInput v-model="userForm.discordName" placeholder="john_doe or John#1234" />
          </UFormGroup>
          <UFormGroup label="Notes">
            <UTextarea v-model="userForm.notes" placeholder="Optional notes about this user..." rows="3" />
          </UFormGroup>
          <p v-if="userFormError" class="text-sm text-red-400">{{ userFormError }}</p>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showAddUser = false">Cancel</UButton>
            <UButton color="green" :loading="savingUser" @click="handleSaveUser">
              {{ editingUser ? 'Save Changes' : 'Add User' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Add/Edit Device Modal -->
    <UModal v-model="showAddDevice">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="editingDevice ? 'i-heroicons-pencil' : 'i-heroicons-device-phone-mobile'" />
            <span class="font-semibold">{{ editingDevice ? 'Edit Device' : 'Add Device' }}</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSaveDevice">
          <UFormGroup label="Device Name" required>
            <UInput v-model="deviceForm.name" placeholder="iPhone 15 Pro" />
          </UFormGroup>
          <UFormGroup label="UDID" required>
            <UInput v-model="deviceForm.udid" placeholder="00000000-000000000000000" class="font-mono" />
          </UFormGroup>
          <UFormGroup label="Platform">
            <USelect v-model="deviceForm.platform" :options="platformOptions" />
          </UFormGroup>
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
          <p v-if="deviceFormError" class="text-sm text-red-400">{{ deviceFormError }}</p>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showAddDevice = false">Cancel</UButton>
            <UButton color="green" :loading="savingDevice" @click="handleSaveDevice">
              {{ editingDevice ? 'Save Changes' : 'Add Device' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Update Profiles After Device Addition Modal -->
    <UModal v-model="showUpdateProfiles">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="text-green-400" />
            <span class="font-semibold text-green-400">Update Provisioning Profiles</span>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-slate-600 dark:text-white/70">
            New device added! Select profiles to regenerate with all current devices and set as your active signing profile:
          </p>

          <div v-if="loadingProfiles" class="flex items-center justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
          </div>

          <div v-else-if="appleProfiles.length === 0" class="text-center py-4 text-slate-500 dark:text-white/50">
            <p>No Ad Hoc or Development profiles found to update.</p>
          </div>

          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="profile in appleProfiles"
              :key="profile.id"
              class="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-4"
            >
              <div class="min-w-0">
                <p class="font-medium truncate text-slate-900 dark:text-white">{{ profile.name }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge :color="getProfileTypeColor(profile.profileType)" variant="soft" size="xs">
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

        <template #footer>
          <div class="flex justify-end">
            <UButton color="gray" variant="ghost" @click="showUpdateProfiles = false">Close</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteConfirm">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2 text-red-400">
            <UIcon name="i-heroicons-exclamation-triangle" />
            <span class="font-semibold">Confirm Delete</span>
          </div>
        </template>

        <p class="text-slate-600 dark:text-white/70">{{ deleteConfirmMessage }}</p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showDeleteConfirm = false">Cancel</UButton>
            <UButton color="red" :loading="deleting" @click="handleDelete">Delete</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'User Database', layout: 'default' })

interface Device {
  id: string
  udid: string
  name: string
  platform: string
  createdAt: string
  updatedAt: string
  isRegisteredInApple?: boolean
}

interface RegisteredUser {
  id: string
  discordName: string
  notes: string | null
  devices: Device[]
  deviceCount: number
  registeredInAppleCount?: number
  createdAt: string
  updatedAt: string
}

interface AppleProfile {
  id: string
  name: string
  platform: string
  profileType: string
  profileState: string
}

const search = ref('')
const refreshing = ref(false)

// Apple connection status
const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

// Fetch users with Apple status if connected
const { data: usersData, pending: loading, refresh: refreshUsersData } = await useFetch<RegisteredUser[]>('/api/registered-users', {
  query: computed(() => ({ includeAppleStatus: appleConnected.value })),
  default: () => []
})

const users = computed(() => usersData.value || [])

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const s = search.value.toLowerCase()
  return users.value.filter(u =>
    u.discordName.toLowerCase().includes(s) ||
    u.notes?.toLowerCase().includes(s) ||
    u.devices.some(d => d.name.toLowerCase().includes(s) || d.udid.toLowerCase().includes(s))
  )
})

// Statistics
const totalDevices = computed(() => users.value.reduce((sum, u) => sum + u.deviceCount, 0))
const registeredInApple = computed(() => users.value.reduce((sum, u) => sum + (u.registeredInAppleCount || 0), 0))
const notRegisteredInApple = computed(() => totalDevices.value - registeredInApple.value)

// Platform options
const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'macOS', value: 'MAC_OS' }
]

// User form state
const showAddUser = ref(false)
const editingUser = ref<RegisteredUser | null>(null)
const userForm = reactive({
  discordName: '',
  notes: ''
})
const userFormError = ref('')
const savingUser = ref(false)

// Device form state
const showAddDevice = ref(false)
const editingDevice = ref<Device | null>(null)
const deviceForUser = ref<RegisteredUser | null>(null)
const deviceForm = reactive({
  name: '',
  udid: '',
  platform: 'IOS'
})
const deviceFormError = ref('')
const savingDevice = ref(false)

// Delete state
const showDeleteConfirm = ref(false)
const deleteConfirmMessage = ref('')
const deleteTarget = ref<{ type: 'user' | 'device'; userId: string; deviceId?: string } | null>(null)
const deleting = ref(false)

// Import state
const importingUser = ref<string | null>(null)
const importingAll = ref(false)
const importAllResult = ref<{ success: boolean; message: string } | null>(null)

// Profile update state (after adding device)
const showUpdateProfiles = ref(false)
const loadingProfiles = ref(false)
const appleProfiles = ref<AppleProfile[]>([])
const regeneratingProfile = ref<string | null>(null)
const regenerateSuccess = ref('')
const regenerateError = ref('')

function getDeviceIcon(platform: string) {
  return platform === 'MAC_OS' ? 'i-heroicons-computer-desktop' : 'i-heroicons-device-phone-mobile'
}

function getDiscordProfileUrl(discordName: string) {
  // Clean the Discord name - remove # and discriminator if present (old format like "John#1234")
  // New Discord usernames are just the username without discriminator
  const cleanName = discordName.includes('#') 
    ? discordName.split('#')[0] 
    : discordName
  
  // Build a Discord URL that attempts to reach the user
  // This format opens Discord and attempts to search/find the user
  return `https://discord.com/users/${encodeURIComponent(cleanName)}`
}

function getProfileTypeColor(type: string) {
  if (type.includes('STORE')) return 'purple'
  if (type.includes('ADHOC')) return 'orange'
  return 'blue'
}

function formatProfileType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

async function refreshUsers() {
  refreshing.value = true
  await refreshUsersData()
  refreshing.value = false
}

// User CRUD
function editUser(user: RegisteredUser) {
  editingUser.value = user
  userForm.discordName = user.discordName
  userForm.notes = user.notes || ''
  userFormError.value = ''
  showAddUser.value = true
}

async function handleSaveUser() {
  if (!userForm.discordName.trim()) {
    userFormError.value = 'Discord name is required'
    return
  }

  savingUser.value = true
  userFormError.value = ''

  try {
    if (editingUser.value) {
      await $fetch(`/api/registered-users/${editingUser.value.id}`, {
        method: 'PATCH',
        body: {
          discordName: userForm.discordName.trim(),
          notes: userForm.notes.trim() || null
        }
      })
    } else {
      await $fetch('/api/registered-users', {
        method: 'POST',
        body: {
          discordName: userForm.discordName.trim(),
          notes: userForm.notes.trim() || undefined
        }
      })
    }
    showAddUser.value = false
    editingUser.value = null
    userForm.discordName = ''
    userForm.notes = ''
    await refreshUsers()
  } catch (e: any) {
    userFormError.value = e?.data?.message || 'Failed to save user'
  } finally {
    savingUser.value = false
  }
}

function confirmDeleteUser(user: RegisteredUser) {
  deleteTarget.value = { type: 'user', userId: user.id }
  deleteConfirmMessage.value = `Are you sure you want to delete "${user.discordName}" and all their ${user.deviceCount} device(s)?`
  showDeleteConfirm.value = true
}

// Device CRUD
function addDeviceToUser(user: RegisteredUser) {
  deviceForUser.value = user
  editingDevice.value = null
  deviceForm.name = ''
  deviceForm.udid = ''
  deviceForm.platform = 'IOS'
  deviceFormError.value = ''
  showAddDevice.value = true
}

function editDevice(user: RegisteredUser, device: Device) {
  deviceForUser.value = user
  editingDevice.value = device
  deviceForm.name = device.name
  deviceForm.udid = device.udid
  deviceForm.platform = device.platform
  deviceFormError.value = ''
  showAddDevice.value = true
}

async function handleSaveDevice() {
  if (!deviceForm.name.trim() || !deviceForm.udid.trim()) {
    deviceFormError.value = 'Device name and UDID are required'
    return
  }

  if (!deviceForUser.value) return

  savingDevice.value = true
  deviceFormError.value = ''

  const isNewDevice = !editingDevice.value

  try {
    if (editingDevice.value) {
      await $fetch(`/api/registered-users/${deviceForUser.value.id}/devices/${editingDevice.value.id}`, {
        method: 'PATCH',
        body: {
          name: deviceForm.name.trim(),
          udid: deviceForm.udid.trim(),
          platform: deviceForm.platform
        }
      })
    } else {
      await $fetch(`/api/registered-users/${deviceForUser.value.id}/devices`, {
        method: 'POST',
        body: {
          name: deviceForm.name.trim(),
          udid: deviceForm.udid.trim(),
          platform: deviceForm.platform
        }
      })
    }
    showAddDevice.value = false
    editingDevice.value = null
    deviceForUser.value = null
    await refreshUsers()
    
    // Show profile update modal for new devices if Apple is connected
    if (isNewDevice && appleConnected.value) {
      regenerateSuccess.value = ''
      regenerateError.value = ''
      await fetchAppleProfiles()
      if (appleProfiles.value.length > 0) {
        showUpdateProfiles.value = true
      }
    }
  } catch (e: any) {
    deviceFormError.value = e?.data?.message || 'Failed to save device'
  } finally {
    savingDevice.value = false
  }
}

function confirmDeleteDevice(user: RegisteredUser, device: Device) {
  deleteTarget.value = { type: 'device', userId: user.id, deviceId: device.id }
  deleteConfirmMessage.value = `Are you sure you want to delete device "${device.name}" (${device.udid})?`
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    if (deleteTarget.value.type === 'user') {
      await $fetch(`/api/registered-users/${deleteTarget.value.userId}`, { method: 'DELETE' })
    } else if (deleteTarget.value.deviceId) {
      await $fetch(`/api/registered-users/${deleteTarget.value.userId}/devices/${deleteTarget.value.deviceId}`, { method: 'DELETE' })
    }
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await refreshUsers()
  } catch (e: any) {
    console.error('Delete failed:', e)
  } finally {
    deleting.value = false
  }
}

// Import to Apple
async function handleImportUser(user: RegisteredUser) {
  importingUser.value = user.id
  try {
    const result = await $fetch<{ registered: number; alreadyRegistered: number; failed: any[] }>(`/api/registered-users/${user.id}/import-to-apple`, {
      method: 'POST'
    })
    await refreshUsers()
    if (result.registered > 0) {
      // Show success somehow - could use a toast
    }
  } catch (e: any) {
    console.error('Import failed:', e)
  } finally {
    importingUser.value = null
  }
}

async function handleImportAll() {
  importingAll.value = true
  importAllResult.value = null
  try {
    const result = await $fetch<{ registered: number; alreadyRegistered: number; failed: any[] }>('/api/registered-users/import-to-apple', {
      method: 'POST',
      body: { all: true }
    })
    await refreshUsers()
    importAllResult.value = {
      success: true,
      message: `Successfully registered ${result.registered} device(s) to Apple. ${result.alreadyRegistered} were already registered.`
    }
  } catch (e: any) {
    importAllResult.value = {
      success: false,
      message: e?.data?.message || 'Failed to import devices'
    }
  } finally {
    importingAll.value = false
  }
}

// Profile update functions
async function fetchAppleProfiles() {
  loadingProfiles.value = true
  try {
    const data = await $fetch<AppleProfile[]>('/api/apple/profiles')
    // Filter to only show Ad Hoc and Development profiles (these use device lists)
    appleProfiles.value = data.filter(p => 
      p.profileType.includes('ADHOC') || p.profileType.includes('DEVELOPMENT')
    )
  } catch (e) {
    console.error('Failed to fetch profiles:', e)
    appleProfiles.value = []
  } finally {
    loadingProfiles.value = false
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

// Reset user modal when closed
watch(showAddUser, (val) => {
  if (!val) {
    editingUser.value = null
    userForm.discordName = ''
    userForm.notes = ''
    userFormError.value = ''
  }
})
</script>

