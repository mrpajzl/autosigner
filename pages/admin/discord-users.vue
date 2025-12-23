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
        </UTable>
      </div>
    </UCard>
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
}

const columns = [
  { key: 'nickname', label: 'User' },
  { key: 'discordId', label: 'Discord ID' },
  { key: 'createdAt', label: 'Joined' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' }
]

const { data: rows } = await useFetch<DiscordUserRow[]>('/api/admin/discord-users')
const searchQuery = ref('')

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

function formatDate(iso: string | Date | null) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>


