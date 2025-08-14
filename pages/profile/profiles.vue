<template>
  <div class="space-y-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-text" />
            <span class="font-semibold">Provisioning Profiles</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <form class="grid md:grid-cols-4 gap-4" @submit.prevent="onUpload">
          <UFormGroup label="Platform">
            <USelect v-model="platform" :options="platformOptions" />
          </UFormGroup>
          <UFormGroup label="Name (optional)">
            <UInput v-model="name" />
          </UFormGroup>
          <UFormGroup label="Profile (.mobileprovision)">
            <input ref="profileRef" type="file" accept=".mobileprovision" class="block w-full text-sm" />
          </UFormGroup>
          <div class="flex items-end">
            <UButton type="submit" color="red">Upload</UButton>
          </div>
        </form>

        <UTable :rows="rows" :columns="columns">
          <template #active-data="{ row }">
            <UBadge :color="row.active ? 'green' : 'gray'">{{ row.active ? 'Active' : 'Inactive' }}</UBadge>
          </template>
          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton size="xs" color="white" variant="soft" @click="activate(row.id)" :disabled="row.active">Activate</UButton>
              <UButton size="xs" color="red" variant="soft" @click="remove(row.id)">Delete</UButton>
            </div>
          </template>
        </UTable>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Provisioning Profiles', layout: 'default' })

type ProfRow = { id: string; name?: string | null; platform: 'IOS' | 'TVOS'; uuid?: string | null; expiresAt?: string | null; createdAt: string; active: boolean }
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'platform', label: 'Platform' },
  { key: 'uuid', label: 'UUID' },
  { key: 'expiresAt', label: 'Expires' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const platform = ref<'IOS' | 'TVOS'>('IOS')
const name = ref('')
const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]
const profileRef = ref<HTMLInputElement | null>(null)

const { data: rows, refresh } = await useFetch<ProfRow[]>('/api/profile/profiles')

async function onUpload() {
  const fd = new FormData()
  fd.set('platform', platform.value)
  if (name.value) fd.set('name', name.value)
  const file = profileRef.value?.files?.[0]
  if (file) fd.set('profile', file)
  await $fetch('/api/profile/profiles', { method: 'POST', body: fd })
  await refresh()
}

async function activate(id: string) {
  await $fetch(`/api/profile/profiles/${id}/activate`, { method: 'POST' })
  await refresh()
}
async function remove(id: string) {
  await $fetch(`/api/profile/profiles/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>


