<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Discord Users List -->
    <UCard class="glass">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" />
            <span class="card-title">Discord Users</span>
            <UBadge color="gray" variant="soft" size="xs">
              {{ filteredRows.length }}{{ searchQuery ? ` / ${rows?.length || 0}` : '' }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search by nickname, Discord username or ID..."
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
        <p>No Discord users found.</p>
        <p class="text-sm mt-1">Users appear here after signing in with Discord OAuth.</p>
      </div>

      <div v-else>
        <UTable :rows="filteredRows" :columns="columns">
          <template #nickname-data="{ row }">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                <img
                  v-if="row.discordAvatar"
                  :src="row.discordAvatar"
                  :alt="row.discordUsername || row.nickname"
                  class="w-full h-full object-cover"
                />
                <UIcon
                  v-else
                  name="i-heroicons-user-circle"
                  class="w-7 h-7 text-slate-400 dark:text-slate-300"
                />
              </div>
              <div class="min-w-0">
                <div class="font-medium text-slate-900 dark:text-white truncate">
                  {{ row.nickname }}
                </div>
                <div class="text-xs text-slate-500 dark:text-white/60 truncate">
                  {{ row.discordUsername || 'Unknown Discord username' }}
                </div>
              </div>
            </div>
          </template>

          <template #discordId-data="{ row }">
            <span class="font-mono text-xs text-slate-600 dark:text-white/70">
              {{ row.discordId || '—' }}
            </span>
          </template>

          <template #createdAt-data="{ row }">
            <span class="text-xs text-slate-600 dark:text-white/70">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>

          <template #role-data="{ row }">
            <UBadge
              :color="row.role === 'SUPERADMIN' ? 'red' : row.role === 'MANAGER' ? 'blue' : 'gray'"
              variant="soft"
              size="xs"
            >
              {{ row.role }}
            </UBadge>
          </template>

          <template #status-data="{ row }">
            <UBadge
              :color="row.status === 'APPROVED' ? 'green' : row.status === 'PENDING' ? 'amber' : 'red'"
              variant="soft"
              size="xs"
            >
              {{ row.status }}
            </UBadge>
          </template>

          <template #linkedRegistration-data="{ row }">
            <div class="text-xs text-slate-600 dark:text-white/70">
              <span v-if="row.linkedRegistrations && row.linkedRegistrations.length > 0">
                Linked with
                <span class="font-medium">
                  {{ row.linkedRegistrations[0].owner.nickname }}
                  <span v-if="row.linkedRegistrations.length > 1">
                    +{{ row.linkedRegistrations.length - 1 }} more
                  </span>
                </span>
              </span>
              <span v-else>
                —
              </span>
            </div>
          </template>

          <template #actions-data="{ row }">
            <div class="flex items-center gap-2 justify-end">
              <UButton
                size="2xs"
                color="blue"
                variant="soft"
                icon="i-heroicons-link"
                @click="openLinkModal(row)"
              >
                Link registration
              </UButton>
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <!-- Link Discord user to registered user modal -->
    <UModal v-model="showLinkModal">
      <UCard class="glass max-w-lg">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-link" />
            <span class="font-semibold">Link Discord User to Registration</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="text-sm text-slate-600 dark:text-white/70">
            <p v-if="selectedDiscordUser">
              Linking for:
              <span class="font-medium">{{ selectedDiscordUser.nickname }}</span>
              <span v-if="selectedDiscordUser.discordId" class="ml-1 text-xs font-mono text-slate-500 dark:text-white/50">
                ({{ selectedDiscordUser.discordId }})
              </span>
            </p>
          </div>

          <UFormGroup label="Search in moderators' user databases" help="Search by Discord name or Discord ID">
            <div class="flex gap-2">
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
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showLinkModal = false">
              Cancel
            </UButton>
            <UButton color="blue" :loading="linkSaving" @click="saveLink">
              Save Link
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Discord Users', layout: 'default' })

type DiscordUserRow = {
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
  { key: 'discordId', label: 'Discord ID' },
  { key: 'createdAt', label: 'Joined' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'linkedRegistration', label: 'Registration Link' },
  { key: 'actions', label: '' }
]

const { data: rows, refresh: refreshRows } = await useFetch<DiscordUserRow[]>('/api/admin/discord-users')
const searchQuery = ref('')

const showLinkModal = ref(false)
const selectedDiscordUser = ref<DiscordUserRow | null>(null)
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

async function openLinkModal(row: DiscordUserRow) {
  selectedDiscordUser.value = row
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
  if (!selectedDiscordUser.value || !selectedRegisteredUserId.value) {
    linkError.value = 'Please select a registered user'
    return
  }

  linkSaving.value = true
  linkError.value = null

  try {
    await $fetch('/api/admin/discord-users/link', {
      method: 'POST',
      body: {
        discordUserId: selectedDiscordUser.value.id,
        registeredUserId: selectedRegisteredUserId.value
      }
    })

    showLinkModal.value = false
    selectedDiscordUser.value = null
    await refreshRows()
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e)
    linkError.value = e?.data?.message || 'Failed to create link'
  } finally {
    linkSaving.value = false
  }
}

function formatDate(iso: string | Date | null) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

</script>
