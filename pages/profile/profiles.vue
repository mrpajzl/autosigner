<template>
  <div class="space-y-6">
    <!-- Apple Integration Banner -->
    <UAlert
      v-if="appleConnected"
      icon="i-heroicons-cloud-arrow-down"
      color="blue"
      variant="soft"
    >
      <template #title>
        <span class="flex items-center gap-2">
          Apple Developer Connected
          <UBadge color="green" variant="soft" size="xs">Active</UBadge>
        </span>
      </template>
      <template #description>
        <p class="mb-2">You can download profiles directly from Apple Developer Portal with automatic UDID management.</p>
        <UButton to="/profile/apple-profiles" size="sm" color="blue" variant="solid" icon="i-heroicons-cloud-arrow-down">
          Manage Apple Profiles
        </UButton>
      </template>
    </UAlert>

    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-text" />
            <span class="font-semibold">Local Provisioning Profiles</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-white/60">Upload .mobileprovision files manually, or download them from Apple Developer Portal.</p>
        
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
            <UButton type="submit" color="red" :loading="uploading">Upload</UButton>
          </div>
        </form>

        <p v-if="uploadMessage" :class="uploadError ? 'text-red-400' : 'text-green-400'" class="text-sm">{{ uploadMessage }}</p>

        <UDivider />

        <UTable :rows="rows" :columns="columns">
          <template #active-data="{ row }">
            <UBadge :color="row.active ? 'green' : 'gray'">{{ row.active ? 'Active' : 'Inactive' }}</UBadge>
          </template>
          <template #expiresAt-data="{ row }">
            <span :class="isExpired(row.expiresAt) ? 'text-red-400' : ''">
              {{ row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '-' }}
            </span>
          </template>
          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton size="xs" color="white" variant="soft" @click="activate(row.id)" :disabled="row.active">Activate</UButton>
              <UButton size="xs" color="red" variant="soft" @click="remove(row.id)">Delete</UButton>
            </div>
          </template>
        </UTable>

        <p v-if="!rows?.length" class="text-center text-white/50 py-4">No profiles uploaded yet</p>
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
const uploading = ref(false)
const uploadMessage = ref('')
const uploadError = ref(false)

const { data: rows, refresh } = await useFetch<ProfRow[]>('/api/profile/profiles')
const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

function isExpired(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

async function onUpload() {
  uploadMessage.value = ''
  uploadError.value = false
  uploading.value = true
  
  try {
    const fd = new FormData()
    fd.set('platform', platform.value)
    if (name.value) fd.set('name', name.value)
    const file = profileRef.value?.files?.[0]
    if (file) fd.set('profile', file)
    await $fetch('/api/profile/profiles', { method: 'POST', body: fd })
    uploadMessage.value = 'Profile uploaded successfully'
    name.value = ''
    if (profileRef.value) profileRef.value.value = ''
    await refresh()
  } catch (e: any) {
    uploadMessage.value = e?.data?.message || 'Failed to upload profile'
    uploadError.value = true
  } finally {
    uploading.value = false
  }
}

async function activate(id: string) {
  await $fetch(`/api/profile/profiles/${id}/activate`, { method: 'POST' })
  await refresh()
}

async function remove(id: string) {
  if (!confirm('Are you sure you want to delete this profile?')) return
  await $fetch(`/api/profile/profiles/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>


