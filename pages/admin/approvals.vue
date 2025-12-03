<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Create User Form -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user-plus" />
          <span class="font-semibold">Create New User</span>
        </div>
      </template>
      <UForm :state="newUser" class="space-y-4" @submit="createNewUser">
        <div class="grid md:grid-cols-3 gap-4">
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Users', layout: 'default' })
const { user: me } = useAuth()
const columns = [
  { key: 'nickname', label: 'Nickname' },
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

// New user creation
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
    refresh()
  } catch (e: any) {
    useToast().add({ title: 'Failed to create user', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    creating.value = false
  }
}
</script>


