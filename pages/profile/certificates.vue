<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-identification" />
            <span class="card-title">Certificates</span>
          </div>
          <UButton icon="i-heroicons-plus" size="xs" color="black" @click="isCreateModalOpen = true">Create via API</UButton>
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
            <p v-if="message" class="text-sm text-slate-600 dark:text-white/70">{{ message }}</p>
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

      <UModal v-model="isCreateModalOpen">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Create New Certificate
              </h3>
              <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isCreateModalOpen = false" />
            </div>
          </template>

          <form @submit.prevent="createCert" class="space-y-4">
            <UFormGroup label="Certificate Type" required>
              <USelect v-model="createForm.certificateType" :options="certTypes" />
            </UFormGroup>
            
            <UFormGroup label="Display Name" help="Optional, will use Apple ID name if empty">
              <UInput v-model="createForm.displayName" placeholder="e.g. My Distribution Cert" />
            </UFormGroup>
            
            <UFormGroup label="P12 Password" help="Optional, leave empty to generate a random secure password">
              <UInput v-model="createForm.password" type="password" autocomplete="new-password" placeholder="••••••••" />
            </UFormGroup>

            <div class="flex justify-end gap-2 pt-4">
              <UButton color="gray" variant="soft" @click="isCreateModalOpen = false">Cancel</UButton>
              <UButton type="submit" color="black" :loading="isCreating">Create Certificate</UButton>
            </div>
          </form>
        </UCard>
      </UModal>
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

// Manual Creation UI
const isCreateModalOpen = ref(false)
const isCreating = ref(false)
const createForm = reactive({
  certificateType: 'IOS_DISTRIBUTION',
  displayName: '',
  password: ''
})

const certTypes = [
  { label: 'iOS Distribution (App Store)', value: 'IOS_DISTRIBUTION' },
  { label: 'iOS Development', value: 'IOS_DEVELOPMENT' },
  { label: 'Mac App Distribution', value: 'MAC_APP_DISTRIBUTION' },
  { label: 'Apple Distribution', value: 'DISTRIBUTION' },
  { label: 'Apple Development', value: 'DEVELOPMENT' }
]

async function createCert() {
  isCreating.value = true
  message.value = ''
  try {
    await $fetch('/api/apple/certificates', {
      method: 'POST',
      body: {
        certificateType: createForm.certificateType,
        displayName: createForm.displayName || undefined,
        password: createForm.password || undefined
      }
    })
    isCreateModalOpen.value = false
    message.value = 'Certificate created successfully!'
    createForm.displayName = ''
    createForm.password = ''
    await refresh()
  } catch (e: any) {
    message.value = e?.data?.message || 'Failed to create certificate'
    // Re-open modal if there was an error so user can correct? 
    // Or just show error on main screen. Let's keep modal closed but show generic error message.
    // Actually, forcing user to re-open is fine if we show toast, but we are using `message` ref.
    // Let's rely on global toast if available, or just the message text.
  } finally {
    isCreating.value = false
  }
}

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


