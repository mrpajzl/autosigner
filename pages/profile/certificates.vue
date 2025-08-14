<template>
  <div class="space-y-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-identification" />
            <span class="font-semibold">Certificates</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <form class="grid md:grid-cols-3 gap-4" @submit.prevent="onUpload">
          <UFormGroup label="Display Name">
            <UInput v-model="displayName" />
          </UFormGroup>
          <UFormGroup label="P12 File">
            <input ref="p12Ref" type="file" accept=".p12,.pfx" class="block w-full text-sm" />
          </UFormGroup>
          <UFormGroup label="P12 Password (if any)">
            <UInput v-model="p12Password" type="password" autocomplete="new-password" />
          </UFormGroup>
          <div class="md:col-span-3 flex items-center gap-3">
            <UButton type="submit" color="red">Upload</UButton>
            <p v-if="message" class="text-sm text-white/70">{{ message }}</p>
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
definePageMeta({ title: 'Certificates', layout: 'default' })

type CertRow = { id: string; displayName?: string | null; createdAt: string; active: boolean }
const columns = [
  { key: 'displayName', label: 'Name' },
  { key: 'createdAt', label: 'Uploaded' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const { data: rows, refresh } = await useFetch<CertRow[]>('/api/profile/certificates')

const displayName = ref('')
const p12Ref = ref<HTMLInputElement | null>(null)
const p12Password = ref('')
const message = ref('')

async function onUpload() {
  try {
    const fd = new FormData()
    if (displayName.value) fd.set('displayName', displayName.value)
    const p12 = p12Ref.value?.files?.[0]
    if (p12) fd.set('p12', p12)
    if (p12Password.value) fd.set('p12Password', p12Password.value)
    await $fetch('/api/profile/certificates', { method: 'POST', body: fd })
    message.value = 'Uploaded.'
    await refresh()
  } catch (e: any) {
    message.value = e?.data?.message || 'Upload failed'
  }
}

async function activate(id: string) {
  await $fetch(`/api/profile/certificates/${id}/activate`, { method: 'POST' })
  await refresh()
}
async function remove(id: string) {
  await $fetch(`/api/profile/certificates/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>


