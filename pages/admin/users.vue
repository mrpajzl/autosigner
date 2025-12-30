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
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <UFormGroup label="Nickname" name="nickname">
            <UInput v-model="newUser.nickname" placeholder="Enter nickname" />
          </UFormGroup>
          <UFormGroup label="Password" name="password">
            <UInput v-model="newUser.password" type="password" placeholder="Min 8 characters" />
          </UFormGroup>
          <UFormGroup label="Role" name="role">
            <USelect v-model="newUser.role" :options="roleOptions" />
          </UFormGroup>
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
                :color="getRoleBadgeColor(roles[row.id])" 
                variant="soft" 
                size="xs"
              >
                {{ getRoleLabel(roles[row.id]) }}
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
                :color="getStatusBadgeColor(statuses[row.id])" 
                variant="soft" 
                size="xs"
              >
                {{ getStatusLabel(statuses[row.id]) }}
              </UBadge>
            </div>
          </template>

          <template #linkedRegistration-data="{ row }">
            <div v-if="row.authProvider === 'discord'" class="hidden xl:flex items-center gap-2">
              <UBadge
                v-if="row.linkedRegistrations && row.linkedRegistrations.length > 0"
                color="green"
                variant="soft"
                size="xs"
                class="max-w-[12rem]"
              >
                <span class="truncate">
                  {{ row.linkedRegistrations[0].owner.nickname }}
                  <span v-if="row.linkedRegistrations.length > 1">
                    +{{ row.linkedRegistrations.length - 1 }}
                  </span>
                </span>
              </UBadge>
              <UButton
                size="2xs"
                color="blue"
                variant="soft"
                :icon="row.linkedRegistrations && row.linkedRegistrations.length > 0 ? 'i-heroicons-pencil' : 'i-heroicons-link'"
                :square="!!(row.linkedRegistrations && row.linkedRegistrations.length > 0)"
                :padded="!(row.linkedRegistrations && row.linkedRegistrations.length > 0)"
                @click="openLinkModal(row)"
              >
                <span v-if="!row.linkedRegistrations || row.linkedRegistrations.length === 0" class="text-xs">
                  Link
                </span>
              </UButton>
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
              v-model="selectedRegisteredUserId"
              :options="registrationOptions"
              value-attribute="value"
              option-attribute="label"
              placeholder="Choose a user from search results"
              :disabled="registrationOptions.length === 0"
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
            {
              label: `Linked with ${row.linkedRegistrations[0].owner.nickname}${row.linkedRegistrations.length > 1 ? ` +${row.linkedRegistrations.length - 1} more` : ''}`,
              disabled: true,
              icon: 'i-heroicons-link',
              class: 'text-xs text-slate-600 dark:text-white/70'
            },
            {
              label: 'Edit Link',
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

const newUser = reactive({ nickname: '', password: '', role: 'MANAGER' })
const creating = ref(false)

async function createNewUser() {
  if (!newUser.nickname || newUser.password.length < 8) {
    useToast().add({ title: 'Error', description: 'Nickname is required and password must be at least 8 characters', color: 'red' })
    return
  }
  creating.value = true
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: newUser })
    useToast().add({ title: 'User created', description: `User "${newUser.nickname}" has been created`, color: 'green' })
    newUser.nickname = ''
    newUser.password = ''
    newUser.role = 'MANAGER'
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
