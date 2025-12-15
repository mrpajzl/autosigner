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
        <h1 class="page-title">User Database</h1>
        <p class="text-sm text-slate-600 dark:text-white/60 mt-1">
          Manage your registered users and their devices for yearly device resets
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="appleConnected"
          to="/profile/user-import"
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
    <div v-if="users.length > 0" class="grid grid-cols-2 md:grid-cols-5 gap-4">
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
      <UCard class="glass border-2 border-emerald-500/30">
        <div class="text-center relative">
          <div class="text-3xl font-bold text-emerald-500">{{ paidUsersCount }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Paid for Next Year</div>
          
          <UButton
            v-if="paidUsersCount > 0"
            color="amber"
            variant="ghost"
            size="2xs"
            class="absolute -top-4 -right-4"
            icon="i-heroicons-arrow-path"
            @click="confirmResetAllPaid"
          >
            Reset
          </UButton>
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
          icon="i-heroicons-arrow-up-on-square"
          @click="openImportModal"
        >
          Import to Apple
        </UButton>
      </div>
      <p v-if="importAllResult" class="mt-3 text-sm" :class="importAllResult.success ? 'text-green-400' : 'text-red-400'">
        {{ importAllResult.message }}
      </p>
    </UCard>

    <!-- Search and Filter -->
    <UCard class="glass">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <UInput
          v-model="search"
          placeholder="Search by name, notes, or UDID..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <div class="flex items-center gap-2">
          <div class="flex rounded-lg bg-white/5 p-1 gap-1">
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
              :class="paymentFilter === 'all' 
                ? 'bg-white/15 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="paymentFilter = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="paymentFilter === 'paid' 
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="paymentFilter = 'paid'"
            >
              <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
              Paid
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5"
              :class="paymentFilter === 'unpaid' 
                ? 'bg-orange-500/20 text-orange-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="paymentFilter = 'unpaid'"
            >
              <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" />
              Unpaid
            </button>
          </div>
          <UButton
            icon="i-heroicons-arrow-path"
            color="gray"
            variant="ghost"
            :loading="refreshing"
            @click="refreshUsers"
          />
        </div>
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
        class="glass ring-0 ring-white/20"
      >
        <div class="space-y-4">
          <!-- User Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center"
                :class="regUser.paidForNextYear 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 ring-2 ring-emerald-400/50' 
                  : 'bg-gradient-to-br from-blue-500 to-purple-500'"
              >
                <span class="text-white font-bold">{{ regUser.discordName.charAt(0).toUpperCase() }}</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-lg text-slate-900 dark:text-white">{{ regUser.discordName }}</h3>
                  <UBadge 
                    v-if="regUser.paidForNextYear" 
                    color="emerald" 
                    variant="soft" 
                    size="xs"
                    class="gap-1"
                  >
                    <UIcon name="i-heroicons-check-badge" class="w-3 h-3" />
                    Paid
                  </UBadge>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-white transition-colors"
                    title="Copy username"
                    @click="copyUsername(regUser.discordName)"
                  >
                    <UIcon 
                      :name="copiedDiscordUser === regUser.discordName ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'" 
                      class="w-4 h-4"
                      :class="{ 'text-green-400': copiedDiscordUser === regUser.discordName }"
                    />
                  </button>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-white/50">
                  <span>{{ regUser.deviceCount }} device{{ regUser.deviceCount === 1 ? '' : 's' }}</span>
                  <span v-if="regUser.registeredInAppleCount !== undefined">
                    • {{ regUser.registeredInAppleCount }}/{{ regUser.deviceCount }} in Apple
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                :class="regUser.paidForNextYear 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'"
                :title="regUser.paidForNextYear ? 'Mark as unpaid' : 'Mark as paid for next year'"
                :disabled="togglingPaid === regUser.id"
                @click="togglePaidStatus(regUser)"
              >
                <UIcon 
                  :name="togglingPaid === regUser.id ? 'i-heroicons-arrow-path' : (regUser.paidForNextYear ? 'i-heroicons-check-badge' : 'i-heroicons-currency-dollar')" 
                  :class="{ 'animate-spin': togglingPaid === regUser.id }"
                  class="w-4 h-4" 
                />
                {{ regUser.paidForNextYear ? 'Paid' : 'Mark Paid' }}
              </button>
              <button
                v-if="appleConnected && regUser.devices.some(d => !d.isRegisteredInApple)"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all"
                :disabled="importingUser === regUser.id"
                @click="handleImportUser(regUser)"
              >
                <UIcon 
                  :name="importingUser === regUser.id ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-up-on-square'" 
                  :class="{ 'animate-spin': importingUser === regUser.id }"
                  class="w-4 h-4" 
                />
                Import
              </button>
              <button
                type="button"
                class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                @click="editUser(regUser)"
              >
                <UIcon name="i-heroicons-pencil" class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                @click="confirmDeleteUser(regUser)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </button>
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
              <div class="flex items-center gap-1.5">
                <UBadge
                  v-if="device.isRegisteredInApple !== undefined"
                  :color="device.isRegisteredInApple ? 'green' : 'orange'"
                  variant="soft"
                  size="xs"
                >
                  {{ device.isRegisteredInApple ? 'In Apple' : 'Not in Apple' }}
                </UBadge>
                <UBadge color="blue" variant="soft" size="xs">{{ device.platform }}</UBadge>
                <button
                  type="button"
                  class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  @click="editDevice(regUser, device)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  @click="confirmDeleteDevice(regUser, device)"
                >
                  <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Add Device Button -->
          <UButton
            color="green"
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

          <!-- Merge Section (only when editing) -->
          <div v-if="editingUser && mergeableUsers.length > 0" class="pt-4 border-t border-white/10">
            <p class="text-sm font-medium text-slate-700 dark:text-white/80 mb-3">Merge with another user</p>
            <div class="space-y-3">
              <UFormGroup label="Select user to merge into">
                <USelectMenu
                  v-model="mergeTargetId"
                  :options="mergeableUserOptions"
                  placeholder="Select a user..."
                  value-attribute="value"
                  option-attribute="label"
                  searchable
                  searchable-placeholder="Search users..."
                />
              </UFormGroup>
              <UAlert
                v-if="mergeTargetId"
                icon="i-heroicons-exclamation-triangle"
                color="orange"
                variant="soft"
                title="Warning"
              >
                <template #description>
                  <p class="text-sm">
                    This will move all {{ editingUser.deviceCount }} device(s) to 
                    <strong>{{ mergeableUsers.find(u => u.id === mergeTargetId)?.discordName }}</strong> 
                    and delete <strong>{{ editingUser.discordName }}</strong>.
                  </p>
                </template>
              </UAlert>
              <UButton
                v-if="mergeTargetId"
                color="orange"
                variant="soft"
                :loading="merging"
                icon="i-heroicons-arrow-right-circle"
                @click="handleMergeUser"
              >
                Merge Users
              </UButton>
              <p v-if="mergeError" class="text-sm text-red-400">{{ mergeError }}</p>
              <p v-if="mergeSuccess" class="text-sm text-green-400">{{ mergeSuccess }}</p>
            </div>
          </div>
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

    <!-- Reset All Paid Confirmation Modal -->
    <UModal v-model="showResetPaidConfirm">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2 text-amber-400">
            <UIcon name="i-heroicons-arrow-path" />
            <span class="font-semibold">Reset All Paid Status</span>
          </div>
        </template>

        <div class="space-y-3">
          <p class="text-slate-600 dark:text-white/70">
            Are you sure you want to reset the paid status for all <strong>{{ paidUsersCount }}</strong> user{{ paidUsersCount === 1 ? '' : 's' }}?
          </p>
          <p class="text-sm text-slate-500 dark:text-white/50">
            This is typically done when starting a new yearly cycle. All users will be marked as unpaid.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showResetPaidConfirm = false">Cancel</UButton>
            <UButton color="amber" :loading="resettingAllPaid" @click="handleResetAllPaid">Reset All</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Import Overview Modal -->
    <UModal v-model="showImportModal" size="xl">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2 text-orange-400">
            <UIcon name="i-heroicons-cloud-arrow-up" />
            <span class="font-semibold">Import Devices to Apple</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between bg-white/5 p-3 rounded-lg">
            <div class="flex items-center gap-2">
              <UToggle v-model="importOptions.onlyPaid" />
              <div class="flex flex-col">
                <span class="text-sm font-medium text-slate-900 dark:text-white">Only Paid Users</span>
                <span class="text-xs text-slate-500 dark:text-white/50">Only import devices from users marked as paid</span>
              </div>
            </div>
          </div>

          <div v-if="isLoadingPreview" class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-orange-400 mb-2" />
            <p class="text-slate-500 font-medium">Checking with Apple...</p>
          </div>

          <div v-else-if="previewData" class="space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-slate-600 dark:text-white/70">
                Found <strong>{{ previewData.totalToImport }}</strong> device(s) to import.
              </p>
              <UBadge :color="previewData.totalToImport > 0 ? 'orange' : 'gray'" variant="soft">
                {{ previewData.totalToImport }} New
              </UBadge>
            </div>

            <!-- Preview List -->
            <div v-if="previewData.devices.length > 0" class="border border-white/10 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table class="min-w-full divide-y divide-white/10">
                <thead class="bg-white/5">
                  <tr>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Device</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/10 bg-transparent">
                  <tr v-for="device in previewData.devices" :key="device.id">
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-white">{{ device.name }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs font-mono text-slate-500">{{ device.udid }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{{ device.discordName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p v-else class="text-center py-4 text-slate-500 italic">
              All devices matching criteria are already in Apple!
            </p>

            <UAlert
              v-if="importOptions.onlyPaid && hiddenByFilterCount > 0 && previewData.totalToImport === 0"
              icon="i-heroicons-information-circle"
              color="blue"
              variant="soft"
              :title="`${hiddenByFilterCount} device(s) are hidden by the 'Paid Only' filter.`"
            >
              <template #description>
                <p class="text-xs mt-1">
                  Disable the filter above to see devices belonging to unpaid users.
                </p>
              </template>
            </UAlert>

            <UAlert
              v-if="importError"
              icon="i-heroicons-exclamation-circle"
              color="red"
              variant="soft"
              :title="importError"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center w-full">
             <div class="text-xs text-slate-500">
                {{ importingAll ? 'Importing...' : 'Ready to import' }}
             </div>
             <div class="flex gap-2">
                <UButton color="gray" variant="ghost" @click="showImportModal = false" :disabled="importingAll">Cancel</UButton>
                <UButton 
                  v-if="previewData && previewData.totalToImport > 0"
                  color="orange" 
                  :loading="importingAll" 
                  @click="confirmImport"
                >
                  Confirm Import
                </UButton>
             </div>
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
  paidForNextYear: boolean
  devices: Device[]
  deviceCount: number
  registeredInAppleCount?: number
  createdAt: string
  updatedAt: string
}

const search = ref('')
const refreshing = ref(false)
const paymentFilter = ref<'all' | 'paid' | 'unpaid'>('all')

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
  let result = users.value
  
  // Apply payment filter
  if (paymentFilter.value === 'paid') {
    result = result.filter(u => u.paidForNextYear)
  } else if (paymentFilter.value === 'unpaid') {
    result = result.filter(u => !u.paidForNextYear)
  }
  
  // Apply search filter
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(u =>
      u.discordName.toLowerCase().includes(s) ||
      u.notes?.toLowerCase().includes(s) ||
      u.devices.some(d => d.name.toLowerCase().includes(s) || d.udid.toLowerCase().includes(s))
    )
  }
  
  return result
})

// Statistics
const totalDevices = computed(() => users.value.reduce((sum, u) => sum + u.deviceCount, 0))
const registeredInApple = computed(() => users.value.reduce((sum, u) => sum + (u.registeredInAppleCount || 0), 0))
const notRegisteredInApple = computed(() => totalDevices.value - registeredInApple.value)
const paidUsersCount = computed(() => users.value.filter(u => u.paidForNextYear).length)

const hiddenByFilterCount = computed(() => {
  return users.value
    .filter(u => !u.paidForNextYear)
    .reduce((sum, u) => sum + u.devices.filter(d => !d.isRegisteredInApple).length, 0)
})

// Platform options
const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'macOS', value: 'MAC_OS' },
  { label: 'Apple TV', value: 'APPLE_TV' }
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

// Merge state
const mergeTargetId = ref<string | null>(null)
const merging = ref(false)
const mergeError = ref('')
const mergeSuccess = ref('')

// Users that can be merged into (all except the one being edited)
const mergeableUsers = computed(() => {
  if (!editingUser.value) return []
  return users.value.filter(u => u.id !== editingUser.value!.id)
})

const mergeableUserOptions = computed(() => {
  return mergeableUsers.value.map(u => ({
    value: u.id,
    label: `${u.discordName} (${u.deviceCount} devices)`
  }))
})

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

// Advanced Import State
const showImportModal = ref(false)
const importOptions = reactive({
  onlyPaid: true
})
const isLoadingPreview = ref(false)
const previewData = ref<{
  totalToImport: number;
  devices: Array<{
    id: string;
    udid: string;
    name: string;
    platform: string;
    discordName: string;
  }>
} | null>(null)
const importError = ref('')

// Paid status toggle state
const togglingPaid = ref<string | null>(null)
const resettingAllPaid = ref(false)
const showResetPaidConfirm = ref(false)

function getDeviceIcon(platform: string) {
  if (platform === 'MAC_OS') return 'i-heroicons-computer-desktop'
  if (platform === 'APPLE_TV') return 'i-heroicons-tv'
  return 'i-heroicons-device-phone-mobile'
}

// Discord copy + open state
const copiedDiscordUser = ref<string | null>(null)

async function copyUsername(discordName: string) {
  try {
    await navigator.clipboard.writeText(discordName)
    copiedDiscordUser.value = discordName
    setTimeout(() => {
      copiedDiscordUser.value = null
    }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

async function refreshUsers() {
  refreshing.value = true
  await refreshUsersData()
  refreshing.value = false
}

// Toggle paid status
async function togglePaidStatus(regUser: RegisteredUser) {
  togglingPaid.value = regUser.id
  try {
    await $fetch(`/api/registered-users/${regUser.id}`, {
      method: 'PATCH',
      body: {
        paidForNextYear: !regUser.paidForNextYear
      }
    })
    await refreshUsers()
  } catch (e: any) {
    console.error('Failed to toggle paid status:', e)
  } finally {
    togglingPaid.value = null
  }
}

// Reset all paid statuses
function confirmResetAllPaid() {
  showResetPaidConfirm.value = true
}

async function handleResetAllPaid() {
  resettingAllPaid.value = true
  try {
    // Reset all paid users
    const paidUsers = users.value.filter(u => u.paidForNextYear)
    await Promise.all(
      paidUsers.map(u =>
        $fetch(`/api/registered-users/${u.id}`, {
          method: 'PATCH',
          body: { paidForNextYear: false }
        })
      )
    )
    showResetPaidConfirm.value = false
    await refreshUsers()
  } catch (e: any) {
    console.error('Failed to reset paid statuses:', e)
  } finally {
    resettingAllPaid.value = false
  }
}

// User CRUD
function editUser(user: RegisteredUser) {
  editingUser.value = user
  userForm.discordName = user.discordName
  userForm.notes = user.notes || ''
  userFormError.value = ''
  // Reset merge state
  mergeTargetId.value = null
  mergeError.value = ''
  mergeSuccess.value = ''
  showAddUser.value = true
}

async function handleMergeUser() {
  if (!editingUser.value || !mergeTargetId.value) return

  merging.value = true
  mergeError.value = ''
  mergeSuccess.value = ''

  try {
    const result = await $fetch<{ devicesMoved: number; devicesSkipped: number; targetUser: { discordName: string } }>(`/api/registered-users/${editingUser.value.id}/merge`, {
      method: 'POST',
      body: {
        targetUserId: mergeTargetId.value
      }
    })

    mergeSuccess.value = `Merged! ${result.devicesMoved} device(s) moved to ${result.targetUser.discordName}.${result.devicesSkipped > 0 ? ` ${result.devicesSkipped} duplicate(s) skipped.` : ''}`
    
    // Close modal and refresh after short delay
    setTimeout(async () => {
      showAddUser.value = false
      editingUser.value = null
      mergeTargetId.value = null
      await refreshUsers()
    }, 1500)
  } catch (e: any) {
    mergeError.value = e?.data?.message || 'Failed to merge users'
  } finally {
    merging.value = false
  }
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

async function openImportModal() {
  showImportModal.value = true
  importOptions.onlyPaid = true // Reset to default
  importError.value = ''
  await fetchPreview()
}

async function fetchPreview() {
  isLoadingPreview.value = true
  previewData.value = null
  importError.value = ''
  
  try {
    const result = await $fetch<any>('/api/registered-users/import-to-apple', {
      method: 'POST',
      body: { 
        all: true,
        onlyPaid: importOptions.onlyPaid,
        dryRun: true
      }
    })
    
    previewData.value = {
      totalToImport: result.totalToImport,
      devices: result.devices
    }
  } catch (e: any) {
    importError.value = e?.data?.message || 'Failed to fetch preview'
  } finally {
    isLoadingPreview.value = false
  }
}

// Watch option changes to re-fetch preview
watch(() => importOptions.onlyPaid, () => {
  if (showImportModal.value) {
    fetchPreview()
  }
})

async function confirmImport() {
  importingAll.value = true
  importAllResult.value = null
  importError.value = ''
  
  try {
    // We can just call with dryRun: false and same params
    const result = await $fetch<{ registered: number; alreadyRegistered: number; failed: any[] }>('/api/registered-users/import-to-apple', {
      method: 'POST',
      body: { 
        all: true, 
        onlyPaid: importOptions.onlyPaid
      }
    })
    
    // Clear preview data to prevent UI glitches/reactivity errors during close
    previewData.value = null
    showImportModal.value = false
    await refreshUsers()
    
    const failedCount = result.failed.length
    let msg = `Successfully registered ${result.registered} device(s) to Apple. ${result.alreadyRegistered} were already registered.`
    
    if (failedCount > 0) {
      msg += ` ${failedCount} device(s) failed to register.`
      console.warn('Failed devices:', result.failed)
      // If all failed, mark as error for visibility
      if (result.registered === 0) {
        importAllResult.value = {
          success: false,
          message: msg + ' Check console for details.'
        }
        return
      }
    }

    importAllResult.value = {
      success: true,
      message: msg
    }
  } catch (e: any) {
    importError.value = e?.data?.message || 'Failed to import devices'
    // Keep modal open on error to show it
  } finally {
    importingAll.value = false
  }
}

// Old simpler handler - kept but replaced in usage
async function handleImportAll() {
  // Redirect to new flow
  openImportModal()
}

// Reset user modal when closed
watch(showAddUser, (val) => {
  if (!val) {
    editingUser.value = null
    userForm.discordName = ''
    userForm.notes = ''
    userFormError.value = ''
    // Reset merge state
    mergeTargetId.value = null
    mergeError.value = ''
    mergeSuccess.value = ''
  }
})
</script>

