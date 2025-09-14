<template>
  <UCard class="glass">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-users" />
        <span class="font-semibold">Users</span>
      </div>
    </template>
    <UTable :rows="rows" :columns="columns">
      <template #role-data="{ row }">
        <USelect v-model="roles[row.id]" :options="roleOptions" size="xs" class="min-w-[10rem]" />
      </template>
      <template #status-data="{ row }">
        <USelect v-model="statuses[row.id]" :options="statusOptions" size="xs" class="min-w-[10rem]" />
      </template>
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton color="white" variant="soft" size="xs" @click="save(row.id)">Save</UButton>
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Users', layout: 'default' })
const { data: me } = await useFetch<{ id: string; role: string } | null>('/api/auth/me')
if (!me.value || me.value.role !== 'SUPERADMIN') {
  navigateTo('/')
}
const columns = [
  { key: 'email', label: 'Email' },
  { key: 'createdAt', label: 'Created' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
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
const { data: rows, refresh } = await useFetch('/api/admin/users')
const roles = reactive<Record<string, 'USER' | 'MANAGER' | 'SUPERADMIN'>>({})
const statuses = reactive<Record<string, 'PENDING' | 'APPROVED' | 'REJECTED'>>({})
watchEffect(() => {
  for (const r of rows.value || []) {
    if (!roles[r.id]) roles[r.id] = (r.role as any) || 'USER'
    if (!statuses[r.id]) statuses[r.id] = (r.status as any) || 'PENDING'
  }
})

async function save(id: string) {
  await $fetch(`/api/admin/users/${id}`, { method: 'POST', body: { role: roles[id], status: statuses[id] } })
  useToast().add({ title: 'Saved', color: 'green' })
  refresh()
}
</script>


