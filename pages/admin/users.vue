<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
    <!-- Create User Form -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user-plus" />
          <span class="card-title">Create New User</span>
        </div>
      </template>
      <UForm :state="newUser" class="space-y-4" @submit="createNewUser">
        <!-- Discord User Matching (Primary Method) -->
        <div class="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-identification" class="text-blue-600 dark:text-blue-400" />
            <span class="font-semibold text-blue-900 dark:text-blue-100">Discord User Matching (Recommended)</span>
          </div>
          
          <UFormGroup label="Discord User ID" help="Enter Discord user ID (18-19 digit number)">
            <UInput
              v-model="discordIdForCreation"
              placeholder="e.g. 123456789012345678"
              class="flex-1"
              :disabled="discordLoadingForCreation"
              @input="fetchDiscordUserForCreation"
            />
          </UFormGroup>

          <!-- Discord User Details -->
          <div v-if="discordDetailsForCreation" class="p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800">
            <div class="flex items-center gap-3">
              <img
                v-if="discordDetailsForCreation.avatar"
                :src="discordDetailsForCreation.avatar"
                :alt="discordDetailsForCreation.username"
                class="w-12 h-12 rounded-full"
              />
              <div v-else class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {{ discordDetailsForCreation.username.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1">
                <div class="font-semibold text-slate-900 dark:text-white">{{ discordDetailsForCreation.username }}</div>
                <div class="text-sm text-slate-600 dark:text-white/60">
                  <span class="font-mono">{{ discordDetailsForCreation.id }}</span>
                  <span v-if="discordDetailsForCreation.globalName" class="ml-2">
                    • {{ discordDetailsForCreation.globalName }}
                  </span>
                </div>
              </div>
              <UBadge color="green" variant="soft" size="sm">Verified</UBadge>
            </div>
          </div>

          <UAlert
            v-if="discordErrorForCreation"
            icon="i-heroicons-exclamation-circle"
            color="red"
            variant="soft"
            :title="discordErrorForCreation"
          />

          <UCheckbox
            v-model="newUser.useCustomNickname"
            label="Use custom nickname instead of Discord username"
          />
        </div>

        <!-- Custom User Creation (Secondary Method) -->
        <div class="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" class="text-slate-600 dark:text-slate-400" />
            <span class="font-semibold text-slate-900 dark:text-slate-100">Custom User (Alternative)</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <UFormGroup label="Nickname" name="nickname" :required="!discordIdForCreation">
              <UInput
                v-model="newUser.nickname"
                placeholder="Enter nickname"
                :disabled="!!discordIdForCreation && !newUser.useCustomNickname"
              />
            </UFormGroup>
            <UFormGroup label="Password" name="password" :required="!discordIdForCreation">
              <UInput
                v-model="newUser.password"
                type="password"
                placeholder="Min 8 characters"
                :disabled="!!discordIdForCreation"
              />
            </UFormGroup>
            <UFormGroup label="Role" name="role">
              <USelect v-model="newUser.role" :options="roleOptions" />
            </UFormGroup>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton type="submit" color="red" variant="solid" :loading="creating" icon="i-heroicons-user-plus" label="Create User" />
        </div>
      </UForm>
    </UCard>

    <!-- Users List -->
    <UCard class="glass">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" />
            <span class="card-title">Users</span>
            <UBadge color="gray" variant="soft" size="xs">
              {{ filteredRows.length }}{{ searchQuery ? ` / ${rows?.length || 0}` : '' }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search by nickname, username or ID..."
              size="sm"
              class="flex-1"
              :ui="{ icon: { trailing: { pointer: '' } } }"
            >
              <template #trailing>
                <UButton
                  v-if="searchQuery"
                  color="gray"
                  variant="link"
                  icon="i-heroicons-x-mark"
                  size="2xs"
                  :padded="false"
                  @click="searchQuery = ''"
                />
              </template>
            </UInput>
          </div>
        </div>
      </template>

      <div v-if="!rows || rows.length === 0" class="text-center py-10 text-slate-500 dark:text-white/60">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No users found.</p>
        <p class="text-sm mt-1">Users will appear here after they sign in.</p>
      </div>

      <div v-else class="-mx-4 sm:mx-0">
        <div class="inline-block min-w-full align-middle px-4 sm:px-0 relative">
          <!-- Backdrop to catch clicks outside info tooltips -->
          <div
            v-if="openInfoTooltipId"
            class="fixed inset-0 z-30"
            @click="openInfoTooltipId = null"
          />
          <UTable :rows="filteredRows" :columns="columns" class="min-w-full">
          <template #nickname-data="{ row }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  v-if="row.discordAvatar"
                  :src="row.discordAvatar"
                  :alt="row.discordUsername || row.nickname"
                  class="w-full h-full object-cover"
                />
                <UIcon
                  v-else
                  name="i-heroicons-user-circle"
                  class="w-8 h-8 text-slate-400 dark:text-slate-300"
                />
              </div>
              <div class="min-w-0 flex-1 flex items-center gap-2">
                <div class="min-w-0">
                  <div class="font-medium text-slate-900 dark:text-white truncate">
                    {{ row.nickname }}
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs text-slate-500 dark:text-white/60 truncate">
                      {{ row.discordUsername || row.authProvider || 'User' }}
                    </span>
                  </div>
                </div>
                <div v-if="row.discordId" class="relative flex-1">
                  <UButton
                    :data-info-button="row.id"
                    icon="i-heroicons-information-circle"
                    color="gray"
                    variant="ghost"
                    size="2xs"
                    square
                    @click.stop="toggleInfoTooltip(row.id)"
                  />
                  <Transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                  >
                    <div
                      v-if="openInfoTooltipId === row.id"
                      class="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 min-w-[200px] rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-3"
                    >
                      <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Discord ID
                      </div>
                      <div class="font-mono text-sm text-slate-900 dark:text-white mb-2">
                        {{ row.discordId }}
                      </div>
                      <UButton
                        icon="i-heroicons-clipboard"
                        color="gray"
                        variant="ghost"
                        size="xs"
                        class="w-full"
                        @click="copyToClipboard(row.discordId)"
                      >
                        Copy
                      </UButton>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </template>

          <template #createdAt-data="{ row }">
            <span class="text-xs text-slate-600 dark:text-white/70 hidden md:inline">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>

          <template #role-data="{ row }">
            <div class="hidden xl:block">
              <USelect 
                v-model="roles[row.id]" 
                :options="roleOptions" 
                size="xs"
                class="min-w-[7rem]"
                @update:model-value="save(row.id)"
              />
            </div>
            <div class="xl:hidden">
              <UBadge 
                :color="getRoleBadgeColor(roles[row.id] || 'USER')" 
                variant="soft" 
                size="xs"
              >
                {{ getRoleLabel(roles[row.id] || 'USER') }}
              </UBadge>
            </div>
          </template>

          <template #status-data="{ row }">
            <div class="hidden xl:block">
              <USelect 
                v-model="statuses[row.id]" 
                :options="statusOptions" 
                size="xs"
                class="min-w-[7rem]"
                @update:model-value="save(row.id)"
              />
            </div>
            <div class="xl:hidden">
              <UBadge 
                :color="getStatusBadgeColor(statuses[row.id] || 'PENDING')" 
                variant="soft" 
                size="xs"
              >
                {{ getStatusLabel(statuses[row.id] || 'PENDING') }}
              </UBadge>
            </div>
          </template>

          <template #linkedRegistration-data="{ row }">
            <div v-if="row.authProvider === 'discord'" class="hidden xl:block">
              <div v-if="row.linkedRegistrations && row.linkedRegistrations.length > 0" class="space-y-2">
                <div
                  v-for="registration in row.linkedRegistrations"
                  :key="registration.id"
                  class="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div class="flex-1 min-w-0">
                    <UBadge
                      color="green"
                      variant="soft"
                      size="xs"
                      class="max-w-[10rem]"
                    >
                      <span class="truncate">
                        {{ registration.owner.nickname }}
                      </span>
                    </UBadge>
                  </div>
                  <UButton
                    size="2xs"
                    color="red"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    square
                    :loading="unlinkingIds.has(registration.id)"
                    @click.stop="unlinkConnection(registration.id, row.nickname, registration.owner.nickname)"
                  />
                </div>
                <UButton
                  size="2xs"
                  color="blue"
                  variant="soft"
                  icon="i-heroicons-pencil"
                  class="w-full"
                  @click.stop="openLinkModal(row)"
                >
                  <span class="text-xs">Edit Links</span>
                </UButton>
              </div>
              <div v-else class="flex items-center gap-2">
                <UButton
                  size="2xs"
                  color="blue"
                  variant="soft"
                  icon="i-heroicons-link"
                  @click.stop="openLinkModal(row)"
                >
                  <span class="text-xs">Link</span>
                </UButton>
              </div>
            </div>
            <div v-else class="hidden xl:inline text-xs text-slate-400 dark:text-white/40">—</div>
          </template>

          <template #menu-data="{ row }">
            <div class="flex items-center gap-2 justify-end">
              <div class="relative xl:hidden">
                <UButton
                  :data-menu-button="row.id"
                  color="gray"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-ellipsis-vertical"
                  square
                  @click.stop="toggleMenu(row.id)"
                />
                <!-- Backdrop to catch clicks outside -->
                <div
                  v-if="openMenuId === row.id"
                  class="fixed inset-0 z-40"
                  @click="openMenuId = null"
                />
                <!-- Dropdown menu -->
                <Transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div
                    v-if="openMenuId === row.id"
                    :class="[
                      'absolute right-0 z-50 min-w-[200px] rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden',
                      menuPositions[row.id] === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                    ]"
                  >
                    <div
                      v-for="(section, sectionIndex) in getUserMenuItems(row)"
                      :key="sectionIndex"
                      class="py-1"
                    >
                      <div
                        v-for="(item, itemIndex) in section"
                        :key="itemIndex"
                        :class="[
                          item.disabled 
                            ? item.class?.includes('uppercase') 
                              ? 'px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'
                              : 'flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-white/70'
                            : 'flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer',
                          item.class || ''
                        ]"
                        @click="!item.disabled && item.click && item.click(); !item.disabled && (openMenuId = null)"
                      >
                        <UIcon 
                          v-if="item.icon" 
                          :name="item.icon" 
                          class="w-4 h-4 flex-shrink-0"
                        />
                        <span>{{ item.label }}</span>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </template>

          </UTable>
        </div>
      </div>
    </UCard>

    <!-- Edit User Modal -->
    <UModal v-model="showEditModal">
      <UCard class="glass max-w-lg">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-pencil" />
            <span class="font-semibold">Edit User</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="text-sm text-slate-600 dark:text-white/70">
            <p v-if="selectedUserForEdit">
              Editing:
              <span class="font-medium">{{ selectedUserForEdit.nickname }}</span>
            </p>
          </div>

          <!-- Discord Matching Section -->
          <div class="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-identification" class="text-blue-600 dark:text-blue-400" />
              <span class="font-semibold text-blue-900 dark:text-blue-100">Link Discord Account</span>
            </div>
            
            <UFormGroup label="Discord User ID" help="Enter Discord user ID (18-19 digit number)">
              <UInput
                v-model="discordIdForEdit"
                placeholder="e.g. 123456789012345678"
                class="flex-1"
                :disabled="discordLoadingForEdit"
                @input="fetchDiscordUserForEdit"
              />
            </UFormGroup>

            <!-- Discord User Details -->
            <div v-if="discordDetailsForEdit" class="p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800">
              <div class="flex items-center gap-3">
                <img
                  v-if="discordDetailsForEdit.avatar"
                  :src="discordDetailsForEdit.avatar"
                  :alt="discordDetailsForEdit.username"
                  class="w-12 h-12 rounded-full"
                />
                <div v-else class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {{ discordDetailsForEdit.username.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-900 dark:text-white">{{ discordDetailsForEdit.username }}</div>
                  <div class="text-sm text-slate-600 dark:text-white/60">
                    <span class="font-mono">{{ discordDetailsForEdit.id }}</span>
                    <span v-if="discordDetailsForEdit.globalName" class="ml-2">
                      • {{ discordDetailsForEdit.globalName }}
                    </span>
                  </div>
                </div>
                <UBadge color="green" variant="soft" size="sm">Verified</UBadge>
              </div>
            </div>

            <UAlert
              v-if="discordErrorForEdit"
              icon="i-heroicons-exclamation-circle"
              color="red"
              variant="soft"
              :title="discordErrorForEdit"
            />

            <UButton
              v-if="selectedUserForEdit?.discordId"
              color="red"
              variant="soft"
              size="sm"
              @click="clearDiscordLink"
            >
              Remove Discord Link
            </UButton>
          </div>

          <!-- Nickname Update -->
          <UFormGroup label="Update Nickname" help="Optional: Change the user's nickname">
            <UInput
              v-model="editUserNickname"
              placeholder="Leave empty to keep current"
            />
          </UFormGroup>

          <p v-if="editError" class="text-sm text-red-400">
            {{ editError }}
          </p>
        </div>

        <template #footer>
          <div class="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <UButton color="gray" variant="ghost" class="w-full sm:w-auto" @click="showEditModal = false">
              Cancel
            </UButton>
            <UButton color="blue" :loading="editSaving" class="w-full sm:w-auto" @click="saveEdit">
              Save Changes
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Link User to Registration Modal -->
    <UModal v-model="showLinkModal">
      <UCard class="glass max-w-lg">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-link" />
            <span class="font-semibold">Link User to Registration</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="text-sm text-slate-600 dark:text-white/70">
            <p v-if="selectedUser">
              Linking for:
              <span class="font-medium">{{ selectedUser.nickname }}</span>
              <span v-if="selectedUser.discordId" class="ml-1 text-xs font-mono text-slate-500 dark:text-white/50">
                ({{ selectedUser.discordId }})
              </span>
            </p>
          </div>

          <UFormGroup label="Search in moderators' user databases" help="Search by Discord name or Discord ID">
            <div class="flex flex-col sm:flex-row gap-2">
              <UInput
                v-model="registrationSearch"
                placeholder="e.g. john_doe, John#1234 or Discord ID"
                class="flex-1"
                size="sm"
                :disabled="registrationLoading"
                @keyup.enter="searchRegisteredUsers"
              />
              <UButton
                size="sm"
                color="gray"
                icon="i-heroicons-magnifying-glass"
                :loading="registrationLoading"
                class="w-full sm:w-auto"
                @click="searchRegisteredUsers"
              >
                Search
              </UButton>
            </div>
          </UFormGroup>

          <UFormGroup label="Select registered user">
            <USelectMenu
              :model-value="selectedRegisteredUserId || undefined"
              :options="registrationOptions"
              value-attribute="value"
              option-attribute="label"
              placeholder="Choose a user from search results"
              :disabled="registrationOptions.length === 0"
              @update:model-value="selectedRegisteredUserId = $event || null"
            />
          </UFormGroup>

          <p v-if="linkError" class="text-sm text-red-400">
            {{ linkError }}
          </p>
        </div>

        <template #footer>
          <div class="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <UButton color="gray" variant="ghost" class="w-full sm:w-auto" @click="showLinkModal = false">
              Cancel
            </UButton>
            <UButton color="blue" :loading="linkSaving" class="w-full sm:w-auto" @click="saveLink">
              Save Link
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'User Management', layout: 'default' })

type UserRow = {
  id: string
  nickname: string
  role: 'SUPERADMIN' | 'MANAGER' | 'USER'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string
  createdAt: string
  authProvider: string
  discordId?: string | null
  discordUsername?: string | null
  discordAvatar?: string | null
  linkedRegistrations?: {
    id: string
    owner: {
      id: string
      nickname: string
    }
  }[]
}

const columns = [
  { key: 'nickname', label: 'User' },
  { key: 'createdAt', label: 'Joined' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'linkedRegistration', label: 'Registration Link' },
  { key: 'menu', label: '' }
]

const roleOptions = [
  { label: 'User', value: 'USER' },
  { label: 'Moderator', value: 'MANAGER' },
  { label: 'Superadmin', value: 'SUPERADMIN' }
]

const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const { data: rows, refresh: refreshRows } = await useFetch<UserRow[]>('/api/admin/users')
const searchQuery = ref('')

const roles = reactive<Record<string, 'USER' | 'MANAGER' | 'SUPERADMIN'>>({})
const statuses = reactive<Record<string, 'PENDING' | 'APPROVED' | 'REJECTED'>>({})
const savingUsers = ref<Set<string>>(new Set())

watchEffect(() => {
  for (const r of rows.value || []) {
    if (!roles[r.id]) roles[r.id] = (r.role as any) || 'USER'
    if (!statuses[r.id]) statuses[r.id] = (r.status as any) || 'PENDING'
  }
})

const showLinkModal = ref(false)
const selectedUser = ref<UserRow | null>(null)
const registrationSearch = ref('')
const registrationLoading = ref(false)
const registrationOptions = ref<
  {
    value: string
    label: string
  }[]
>([])
const selectedRegisteredUserId = ref<string | null>(null)
const linkError = ref<string | null>(null)
const linkSaving = ref(false)
const openMenuId = ref<string | null>(null)
const menuPositions = ref<Record<string, 'top' | 'bottom'>>({})
const openInfoTooltipId = ref<string | null>(null)

// Edit user modal
const showEditModal = ref(false)
const selectedUserForEdit = ref<UserRow | null>(null)
const discordIdForEdit = ref('')
const discordLoadingForEdit = ref(false)
const discordDetailsForEdit = ref<{
  id: string
  username: string
  avatar: string | null
  globalName?: string | null
} | null>(null)
const discordErrorForEdit = ref<string | null>(null)
const editUserNickname = ref('')
const editError = ref<string | null>(null)
const editSaving = ref(false)

// Discord connections
const unlinkingIds = ref<Set<string>>(new Set())

async function unlinkConnection(registeredUserId: string, discordUserName: string, ownerName: string) {
  if (unlinkingIds.value.has(registeredUserId)) return

  unlinkingIds.value.add(registeredUserId)
  try {
    await $fetch('/api/admin/discord-users/unlink', {
      method: 'POST',
      body: { registeredUserId }
    })
    
    useToast().add({ 
      title: 'Connection removed', 
      description: `Unlinked ${discordUserName} from ${ownerName}'s registration`, 
      color: 'green' 
    })
    
    // Refresh the users table
    await refreshRows()
  } catch (e: any) {
    console.error(e)
    useToast().add({ 
      title: 'Failed to unlink', 
      description: e?.data?.message || 'An error occurred', 
      color: 'red' 
    })
  } finally {
    unlinkingIds.value.delete(registeredUserId)
  }
}

const filteredRows = computed(() => {
  if (!rows.value) return []
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return rows.value

  return rows.value.filter((row) => {
    const nickname = row.nickname?.toLowerCase() || ''
    const discordUsername = row.discordUsername?.toLowerCase() || ''
    const discordId = row.discordId?.toLowerCase() || ''
    return (
      nickname.includes(query) ||
      discordUsername.includes(query) ||
      discordId.includes(query)
    )
  })
})

async function openLinkModal(row: UserRow) {
  selectedUser.value = row
  registrationSearch.value = row.nickname || ''
  selectedRegisteredUserId.value = null
  registrationOptions.value = []
  linkError.value = null
  showLinkModal.value = true
}

async function searchRegisteredUsers() {
  const q = registrationSearch.value.trim()
  registrationOptions.value = []
  selectedRegisteredUserId.value = null
  linkError.value = null

  if (!q) {
    return
  }

  registrationLoading.value = true
  try {
    const results = await $fetch<Array<{
      id: string
      discordName: string
      discordId?: string | null
      owner: { id: string; nickname: string }
      linkedUser: {
        id: string
        nickname: string
        discordId?: string | null
        discordUsername?: string | null
      } | null
    }>>('/api/admin/registered-users.search', {
      query: { q }
    })

    registrationOptions.value = results.map((r) => ({
      value: r.id,
      label: `${r.discordName} (${r.owner.nickname}${r.linkedUser ? ' • already linked' : ''})`
    }))

    if (registrationOptions.value.length === 0) {
      linkError.value = 'No matching registered users found'
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e)
    linkError.value = e?.data?.message || 'Failed to search registered users'
  } finally {
    registrationLoading.value = false
  }
}

async function saveLink() {
  if (!selectedUser.value || !selectedRegisteredUserId.value) {
    linkError.value = 'Please select a registered user'
    return
  }

  linkSaving.value = true
  linkError.value = null

  try {
    await $fetch('/api/admin/discord-users/link', {
      method: 'POST',
      body: {
        discordUserId: selectedUser.value.id,
        registeredUserId: selectedRegisteredUserId.value
      }
    })

    showLinkModal.value = false
    selectedUser.value = null
    await refreshRows()
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e)
    linkError.value = e?.data?.message || 'Failed to create link'
  } finally {
    linkSaving.value = false
  }
}

async function save(id: string) {
  if (savingUsers.value.has(id)) return
  
  savingUsers.value.add(id)
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'POST', body: { role: roles[id], status: statuses[id] } })
    useToast().add({ title: 'Saved', color: 'green' })
    await refreshRows()
  } catch (e: any) {
    useToast().add({ title: 'Failed to save', description: e?.data?.message || 'An error occurred', color: 'red' })
  } finally {
    savingUsers.value.delete(id)
  }
}

function toggleMenu(userId: string) {
  if (openMenuId.value === userId) {
    openMenuId.value = null
  } else {
    openMenuId.value = userId
    openInfoTooltipId.value = null // Close info tooltip when opening menu
    setTimeout(() => {
      checkMenuPosition(userId)
    }, 0)
  }
}

function toggleInfoTooltip(userId: string) {
  if (openInfoTooltipId.value === userId) {
    openInfoTooltipId.value = null
  } else {
    openInfoTooltipId.value = userId
    openMenuId.value = null // Close menu when opening info tooltip
  }
}

function checkMenuPosition(userId: string) {
  if (openMenuId.value !== userId) return
  
  const buttonElement = document.querySelector(`[data-menu-button="${userId}"]`) as HTMLElement
  if (!buttonElement) return
  
  const rect = buttonElement.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const estimatedMenuHeight = 350
  
  if (spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight) {
    menuPositions.value[userId] = 'top'
  } else {
    menuPositions.value[userId] = 'bottom'
  }
}

function getRoleLabel(role: string) {
  return roleOptions.find(opt => opt.value === role)?.label || role
}

function getStatusLabel(status: string) {
  return statusOptions.find(opt => opt.value === status)?.label || status
}

function getRoleBadgeColor(role: string): 'gray' | 'blue' | 'purple' {
  switch (role) {
    case 'SUPERADMIN':
      return 'purple'
    case 'MANAGER':
      return 'blue'
    default:
      return 'gray'
  }
}

function getStatusBadgeColor(status: string): 'yellow' | 'green' | 'red' {
  switch (status) {
    case 'APPROVED':
      return 'green'
    case 'REJECTED':
      return 'red'
    default:
      return 'yellow'
  }
}

function getUserMenuItems(row: UserRow) {
  const menuItems: any[] = []
  const userId = row.id
  
  menuItems.push([
    {
      label: 'Edit User',
      icon: 'i-heroicons-pencil',
      click: () => {
        openEditModal(row)
        openMenuId.value = null
      }
    }
  ])
  
  menuItems.push([
    {
      label: 'Role',
      disabled: true,
      class: 'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'
    },
    ...roleOptions.map(option => ({
      label: option.label,
      click: async () => {
        roles[userId] = option.value as 'USER' | 'MANAGER' | 'SUPERADMIN'
        await save(userId)
        openMenuId.value = null
      },
      icon: roles[userId] === option.value ? 'i-heroicons-check' : undefined,
      class: roles[userId] === option.value ? 'font-medium' : ''
    }))
  ])
  
  menuItems.push([
    {
      label: 'Status',
      disabled: true,
      class: 'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'
    },
    ...statusOptions.map(option => ({
      label: option.label,
      click: async () => {
        statuses[userId] = option.value as 'PENDING' | 'APPROVED' | 'REJECTED'
        await save(userId)
        openMenuId.value = null
      },
      icon: statuses[userId] === option.value ? 'i-heroicons-check' : undefined,
      class: statuses[userId] === option.value ? 'font-medium' : ''
    }))
  ])
  
  if (row.authProvider === 'discord') {
    menuItems.push([
      {
        label: 'Registration Link',
        disabled: true,
        class: 'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'
      },
      ...(row.linkedRegistrations && row.linkedRegistrations.length > 0
        ? [
            ...row.linkedRegistrations.map((registration) => ({
              label: `Linked: ${registration.owner.nickname}`,
              disabled: true,
              icon: 'i-heroicons-link',
              class: 'text-xs text-slate-600 dark:text-white/70'
            })),
            ...row.linkedRegistrations.map((registration) => ({
              label: `Unlink ${registration.owner.nickname}`,
              icon: 'i-heroicons-x-mark',
              click: async () => {
                await unlinkConnection(registration.id, row.nickname, registration.owner.nickname)
                openMenuId.value = null
              }
            })),
            {
              label: 'Edit Links',
              icon: 'i-heroicons-pencil',
              click: () => {
                openLinkModal(row)
                openMenuId.value = null
              }
            }
          ]
        : [
            {
              label: 'Link Registration',
              icon: 'i-heroicons-link',
              click: () => {
                openLinkModal(row)
                openMenuId.value = null
              }
            }
          ])
    ])
  }
  
  return menuItems
}

const newUser = reactive({
  nickname: '',
  password: '',
  role: 'MANAGER' as 'USER' | 'MANAGER' | 'SUPERADMIN',
  useCustomNickname: false
})
const creating = ref(false)

// Discord ID for user creation
const discordIdForCreation = ref('')
const discordLoadingForCreation = ref(false)
const discordDetailsForCreation = ref<{
  id: string
  username: string
  avatar: string | null
  globalName?: string | null
} | null>(null)
const discordErrorForCreation = ref<string | null>(null)

async function fetchDiscordUserForCreation() {
  const discordId = discordIdForCreation.value.trim()
  discordDetailsForCreation.value = null
  discordErrorForCreation.value = null

  // Validate Discord ID format (18-19 digits)
  if (!discordId) {
    return
  }

  if (!/^\d{17,19}$/.test(discordId)) {
    discordErrorForCreation.value = 'Invalid Discord ID format (must be 18-19 digits)'
    return
  }

  discordLoadingForCreation.value = true
  try {
    const details = await $fetch<{
      id: string
      username: string
      avatar: string | null
      globalName?: string | null
    }>(`/api/admin/discord-users/${discordId}`)

    discordDetailsForCreation.value = details
    
    // Auto-fill nickname if not using custom nickname
    if (!newUser.useCustomNickname) {
      newUser.nickname = details.username
    }
  } catch (e: any) {
    console.error(e)
    discordErrorForCreation.value = e?.data?.message || 'Failed to fetch Discord user'
    discordDetailsForCreation.value = null
  } finally {
    discordLoadingForCreation.value = false
  }
}

// Watch for custom nickname checkbox
watch(() => newUser.useCustomNickname, (useCustom) => {
  if (!useCustom && discordDetailsForCreation.value) {
    newUser.nickname = discordDetailsForCreation.value.username
  }
})

async function createNewUser() {
  // Validate: either Discord ID provided OR custom nickname + password provided
  const discordId = discordIdForCreation.value.trim()
  if (!discordId) {
    if (!newUser.nickname || newUser.password.length < 8) {
      useToast().add({ title: 'Error', description: 'Either provide a Discord ID or provide nickname and password (min 8 characters)', color: 'red' })
      return
    }
  }

  // If Discord ID is provided, validate format
  if (discordId && !/^\d{17,19}$/.test(discordId)) {
    useToast().add({ title: 'Error', description: 'Invalid Discord ID format (must be 18-19 digits)', color: 'red' })
    return
  }

  creating.value = true
  try {
    const body: any = {
      role: newUser.role
    }

    if (discordId) {
      // Create user from Discord
      body.discordId = discordId
      body.useCustomNickname = newUser.useCustomNickname
      if (newUser.useCustomNickname && newUser.nickname) {
        body.nickname = newUser.nickname
      }
    } else {
      // Create traditional user
      body.nickname = newUser.nickname
      body.password = newUser.password
    }

    const result = await $fetch('/api/admin/users', { method: 'POST', body })
    useToast().add({ title: 'User created', description: `User "${result.nickname}" has been created`, color: 'green' })
    
    // Reset form
    newUser.nickname = ''
    newUser.password = ''
    newUser.role = 'MANAGER'
    newUser.useCustomNickname = false
    discordIdForCreation.value = ''
    discordDetailsForCreation.value = null
    discordErrorForCreation.value = null
    
    refreshRows()
  } catch (e: any) {
    useToast().add({ title: 'Failed to create user', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    creating.value = false
  }
}

function formatDate(iso: string | Date | null) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    useToast().add({ title: 'Copied to clipboard', color: 'green' })
  } catch (e) {
    useToast().add({ title: 'Failed to copy', color: 'red' })
  }
}

function openEditModal(row: UserRow) {
  selectedUserForEdit.value = row
  discordIdForEdit.value = row.discordId || ''
  discordDetailsForEdit.value = null
  discordErrorForEdit.value = null
  editUserNickname.value = ''
  editError.value = null
  if (row.discordId) {
    fetchDiscordUserForEdit()
  }
  showEditModal.value = true
}

async function fetchDiscordUserForEdit() {
  const discordId = discordIdForEdit.value.trim()
  discordDetailsForEdit.value = null
  discordErrorForEdit.value = null

  // Validate Discord ID format (18-19 digits)
  if (!discordId) {
    return
  }

  if (!/^\d{17,19}$/.test(discordId)) {
    discordErrorForEdit.value = 'Invalid Discord ID format (must be 18-19 digits)'
    return
  }

  discordLoadingForEdit.value = true
  try {
    const details = await $fetch<{
      id: string
      username: string
      avatar: string | null
      globalName?: string | null
    }>(`/api/admin/discord-users/${discordId}`)

    discordDetailsForEdit.value = details
  } catch (e: any) {
    console.error(e)
    discordErrorForEdit.value = e?.data?.message || 'Failed to fetch Discord user'
    discordDetailsForEdit.value = null
  } finally {
    discordLoadingForEdit.value = false
  }
}

function clearDiscordLink() {
  discordIdForEdit.value = ''
  discordDetailsForEdit.value = null
  discordErrorForEdit.value = null
}

async function saveEdit() {
  if (!selectedUserForEdit.value) {
    return
  }

  editSaving.value = true
  editError.value = null

  try {
    const body: any = {}
    const discordId = discordIdForEdit.value.trim()

    if (discordId) {
      // Validate Discord ID format
      if (!/^\d{17,19}$/.test(discordId)) {
        editError.value = 'Invalid Discord ID format (must be 18-19 digits)'
        editSaving.value = false
        return
      }
      body.discordId = discordId
    } else if (selectedUserForEdit.value.discordId && !discordId) {
      // Clear Discord link
      body.discordId = null
      body.discordUsername = null
      body.discordAvatar = null
      body.authProvider = 'local'
    }

    if (editUserNickname.value.trim()) {
      body.nickname = editUserNickname.value.trim()
    }

    if (Object.keys(body).length === 0) {
      editError.value = 'No changes to save'
      editSaving.value = false
      return
    }

    await $fetch(`/api/admin/users/${selectedUserForEdit.value.id}`, {
      method: 'POST',
      body
    })

    useToast().add({ title: 'User updated', description: 'User has been updated successfully', color: 'green' })
    showEditModal.value = false
    selectedUserForEdit.value = null
    discordIdForEdit.value = ''
    discordDetailsForEdit.value = null
    discordErrorForEdit.value = null
    await refreshRows()
  } catch (e: any) {
    console.error(e)
    editError.value = e?.data?.message || 'Failed to update user'
  } finally {
    editSaving.value = false
  }
}

</script>

<style scoped>
/* Hide table columns on smaller screens */
@media (max-width: 1279px) {
  :deep(thead th:nth-child(4)),
  :deep(tbody td:nth-child(4)),
  :deep(thead th:nth-child(5)),
  :deep(tbody td:nth-child(5)) {
    display: none; /* Status and Registration Link - hide below xl (1280px) */
  }
}

@media (max-width: 767px) {
  :deep(thead th:nth-child(2)),
  :deep(tbody td:nth-child(2)) {
    display: none; /* Joined - hide below md (768px) */
  }
}

/* Hide menu column on xl screens and above */
@media (min-width: 1280px) {
  :deep(thead th:nth-child(6)),
  :deep(tbody td:nth-child(6)) {
    display: none; /* Menu - hide on xl and above */
  }
}
</style>
