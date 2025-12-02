<template>
  <div class="space-y-8">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rocket-launch" />
            <span class="font-semibold">Upload New IPA</span>
          </div>
          <UBadge color="white" variant="soft">Uses active cert & profile</UBadge>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="uploadIpa">
        <div class="grid md:grid-cols-2 gap-4">
          <UFormGroup label="App Name" required>
            <UInput v-model="appForm.name" placeholder="My App" />
          </UFormGroup>
          <UFormGroup label="Bundle ID (optional)">
            <UInput v-model="appForm.bundleId" placeholder="com.example.app" />
          </UFormGroup>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <UFormGroup label="Version (optional)">
            <UInput v-model="appForm.version" placeholder="1.0.0" />
          </UFormGroup>
          <UFormGroup label="Platform" required>
            <USelect v-model="appForm.platform" :options="platformOptions" />
          </UFormGroup>
        </div>
        <UFormGroup label="IPA File" required>
          <input
            ref="ipaInput"
            type="file"
            accept=".ipa"
            class="file:mr-4 file:rounded-md file:border-0 file:bg-primary-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
          />
        </UFormGroup>
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
          <span>Signing runs automatically after upload with your latest active assets.</span>
          <UButton
            type="submit"
            color="white"
            variant="soft"
            icon="i-heroicons-arrow-up-tray"
            :loading="uploadingIpa"
          >
            Upload & Sign
          </UButton>
        </div>
      </form>
    </UCard>

    <div class="grid md:grid-cols-2 gap-6">
      <UCard class="glass space-y-4">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-identification" />
              <span class="font-semibold">Certificates</span>
            </div>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="uploadCertificate">
          <div class="grid md:grid-cols-2 gap-4">
            <UFormGroup label="Display Name">
              <UInput v-model="certificateForm.displayName" placeholder="Prod Signing Cert" />
            </UFormGroup>
            <UFormGroup label="P12 Password (optional)">
              <UInput v-model="certificateForm.password" type="password" autocomplete="new-password" />
            </UFormGroup>
          </div>
          <UFormGroup label="P12 File" required>
            <input ref="certificateInput" type="file" accept=".p12,.pfx" class="block w-full text-sm" />
          </UFormGroup>
          <div class="flex justify-end">
            <UButton type="submit" color="red" icon="i-heroicons-arrow-up-tray" :loading="uploadingCertificate">
              Upload Certificate
            </UButton>
          </div>
        </form>

        <UTable :rows="certificateRows" :columns="certificateColumns">
          <template #createdAt-data="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
          <template #active-data="{ row }">
            <UBadge :color="row.active ? 'green' : 'gray'">
              {{ row.active ? 'Active' : 'Inactive' }}
            </UBadge>
          </template>
          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton
                size="xs"
                color="white"
                variant="soft"
                :disabled="row.active"
                @click="activateCertificate(row.id)"
              >
                Activate
              </UButton>
              <UButton size="xs" color="red" variant="soft" @click="deleteCertificate(row.id)">
                Delete
              </UButton>
            </div>
          </template>
        </UTable>
      </UCard>

      <UCard class="glass space-y-4">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" />
              <span class="font-semibold">Provisioning Profiles</span>
            </div>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="uploadProfile">
          <div class="grid md:grid-cols-2 gap-4">
            <UFormGroup label="Platform">
              <USelect v-model="profileForm.platform" :options="platformOptions" />
            </UFormGroup>
            <UFormGroup label="Name (optional)">
              <UInput v-model="profileForm.name" placeholder="Ad Hoc iOS" />
            </UFormGroup>
          </div>
          <UFormGroup label="Profile (.mobileprovision)" required>
            <input ref="profileInput" type="file" accept=".mobileprovision" class="block w-full text-sm" />
          </UFormGroup>
          <div class="flex justify-end">
            <UButton type="submit" color="red" icon="i-heroicons-arrow-up-tray" :loading="uploadingProfile">
              Upload Profile
            </UButton>
          </div>
        </form>

        <UTable :rows="profileRows" :columns="profileColumns">
          <template #expiresAt-data="{ row }">
            {{ row.expiresAt ? formatDate(row.expiresAt) : '—' }}
          </template>
          <template #active-data="{ row }">
            <UBadge :color="row.active ? 'green' : 'gray'">
              {{ row.active ? 'Active' : 'Inactive' }}
            </UBadge>
          </template>
          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton
                size="xs"
                color="white"
                variant="soft"
                :disabled="row.active"
                @click="activateProfile(row.id)"
              >
                Activate
              </UButton>
              <UButton size="xs" color="red" variant="soft" @click="deleteProfile(row.id)">
                Delete
              </UButton>
            </div>
          </template>
        </UTable>
      </UCard>
    </div>

    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">Apps</span>
          </div>
          <UButton to="/apps/new" color="white" variant="soft" icon="i-heroicons-plus-circle">
            Upload from classic form
          </UButton>
        </div>
      </template>

      <UTable :rows="appRows" :columns="appColumns">
        <template #status-data="{ row }">
          <UBadge
            :color="row.status === 'SIGNED' ? 'green' : row.status === 'FAILED' ? 'red' : 'yellow'"
          >
            {{ row.status }}
          </UBadge>
        </template>
        <template #actions-data="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-heroicons-arrow-path"
              color="white"
              variant="soft"
              size="xs"
              :loading="resigningId === row.id"
              @click="resignApp(row.id)"
            >
              Sign with latest assets
            </UButton>
            <UButton
              icon="i-heroicons-trash"
              color="red"
              variant="soft"
              size="xs"
              :loading="deletingId === row.id"
              @click="deleteApp(row)"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Signing Workbench', layout: 'default' })

type Platform = 'IOS' | 'TVOS'
type AppRow = {
  id: string
  name: string
  bundleId: string
  version: string
  platform: Platform
  status: string
}
type CertRow = { id: string; displayName?: string | null; createdAt: string; active: boolean }
type ProfileRow = {
  id: string
  name?: string | null
  platform: Platform
  uuid?: string | null
  expiresAt?: string | null
  createdAt: string
  active: boolean
}

const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]

const toast = useToast()

const appForm = reactive({
  name: '',
  bundleId: '',
  version: '',
  platform: 'IOS' as Platform
})
const ipaInput = ref<HTMLInputElement | null>(null)
const uploadingIpa = ref(false)

const certificateForm = reactive({ displayName: '', password: '' })
const certificateInput = ref<HTMLInputElement | null>(null)
const uploadingCertificate = ref(false)

const profileForm = reactive({ platform: 'IOS' as Platform, name: '' })
const profileInput = ref<HTMLInputElement | null>(null)
const uploadingProfile = ref(false)

const { data: apps, refresh: refreshApps } = await useFetch<AppRow[]>('/api/apps')
const { data: certificates, refresh: refreshCertificates } = await useFetch<CertRow[]>('/api/profile/certificates')
const { data: profiles, refresh: refreshProfiles } = await useFetch<ProfileRow[]>('/api/profile/profiles')

const appRows = computed(() => apps.value ?? [])
const certificateRows = computed(() => certificates.value ?? [])
const profileRows = computed(() => profiles.value ?? [])

const appColumns = [
  { key: 'name', label: 'Name' },
  { key: 'bundleId', label: 'Bundle ID' },
  { key: 'version', label: 'Version' },
  { key: 'platform', label: 'Platform' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const certificateColumns = [
  { key: 'displayName', label: 'Name' },
  { key: 'createdAt', label: 'Uploaded' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const profileColumns = [
  { key: 'name', label: 'Name' },
  { key: 'platform', label: 'Platform' },
  { key: 'uuid', label: 'UUID' },
  { key: 'expiresAt', label: 'Expires' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Actions' }
]

const resigningId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return date.toLocaleString()
}

async function uploadIpa() {
  const file = ipaInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select an IPA file first', color: 'red' })
    return
  }
  if (!appForm.name) {
    toast.add({ title: 'App name is required', color: 'red' })
    return
  }
  uploadingIpa.value = true
  try {
    const body = new FormData()
    body.set('name', appForm.name)
    if (appForm.bundleId) body.set('bundleId', appForm.bundleId)
    if (appForm.version) body.set('version', appForm.version)
    body.set('platform', appForm.platform)
    body.set('ipa', file)
    await $fetch('/api/apps/upload', { method: 'POST', body })
    toast.add({ title: 'Upload started', description: 'Signing kicks off shortly.', color: 'green' })
    appForm.name = ''
    appForm.bundleId = ''
    appForm.version = ''
    appForm.platform = 'IOS'
    if (ipaInput.value) ipaInput.value.value = ''
    await refreshApps()
  } catch (e: any) {
    toast.add({ title: 'IPA upload failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    uploadingIpa.value = false
  }
}

async function uploadCertificate() {
  const file = certificateInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select a P12 file first', color: 'red' })
    return
  }
  uploadingCertificate.value = true
  try {
    const body = new FormData()
    if (certificateForm.displayName) body.set('displayName', certificateForm.displayName)
    if (certificateForm.password) body.set('p12Password', certificateForm.password)
    body.set('p12', file)
    await $fetch('/api/profile/certificates', { method: 'POST', body })
    toast.add({ title: 'Certificate uploaded', color: 'green' })
    certificateForm.displayName = ''
    certificateForm.password = ''
    if (certificateInput.value) certificateInput.value.value = ''
    await refreshCertificates()
  } catch (e: any) {
    toast.add({ title: 'Certificate upload failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    uploadingCertificate.value = false
  }
}

async function uploadProfile() {
  const file = profileInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select a provisioning profile', color: 'red' })
    return
  }
  uploadingProfile.value = true
  try {
    const body = new FormData()
    body.set('platform', profileForm.platform)
    if (profileForm.name) body.set('name', profileForm.name)
    body.set('profile', file)
    await $fetch('/api/profile/profiles', { method: 'POST', body })
    toast.add({ title: 'Profile uploaded', color: 'green' })
    profileForm.name = ''
    profileForm.platform = 'IOS'
    if (profileInput.value) profileInput.value.value = ''
    await refreshProfiles()
  } catch (e: any) {
    toast.add({ title: 'Profile upload failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    uploadingProfile.value = false
  }
}

async function activateCertificate(id: string) {
  await $fetch(`/api/profile/certificates/${id}/activate`, { method: 'POST' })
  toast.add({ title: 'Certificate activated', color: 'green' })
  await refreshCertificates()
}

async function deleteCertificate(id: string) {
  const confirmed = typeof window === 'undefined' ? true : window.confirm('Remove this certificate?')
  if (!confirmed) return
  await $fetch(`/api/profile/certificates/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Certificate deleted', color: 'green' })
  await refreshCertificates()
}

async function activateProfile(id: string) {
  await $fetch(`/api/profile/profiles/${id}/activate`, { method: 'POST' })
  toast.add({ title: 'Profile activated', color: 'green' })
  await refreshProfiles()
}

async function deleteProfile(id: string) {
  const confirmed = typeof window === 'undefined' ? true : window.confirm('Remove this provisioning profile?')
  if (!confirmed) return
  await $fetch(`/api/profile/profiles/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Profile deleted', color: 'green' })
  await refreshProfiles()
}

async function resignApp(id: string) {
  try {
    resigningId.value = id
    await $fetch(`/api/apps/${id}/resign`, { method: 'POST' })
    toast.add({ title: 'Signing started', description: 'Check back in a moment.', color: 'green' })
    await refreshApps()
  } catch (e: any) {
    toast.add({ title: 'Signing failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    resigningId.value = null
  }
}

async function deleteApp(row: AppRow) {
  const confirmed = typeof window === 'undefined' ? true : window.confirm(`Delete "${row.name}"?`)
  if (!confirmed) return
  try {
    deletingId.value = row.id
    await $fetch(`/api/apps/${row.id}`, { method: 'DELETE' })
    toast.add({ title: 'App deleted' })
    await refreshApps()
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    deletingId.value = null
  }
}
</script>





