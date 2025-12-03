<template>
  <div class="space-y-6">
    <!-- Upload New App -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-up-tray" />
            <span class="font-semibold">Upload New App</span>
          </div>
          <UButton
            to="/profile"
            color="gray"
            variant="soft"
            icon="i-heroicons-identification"
            size="sm"
          >
            Manage Certificates & Profiles
          </UButton>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="uploadIpa()">
        <div class="grid md:grid-cols-3 gap-4">
          <UFormGroup label="App Name" required>
            <UInput v-model="uploadForm.name" placeholder="My App" />
          </UFormGroup>
          <UFormGroup label="Platform" required>
            <USelect v-model="uploadForm.platform" :options="platformOptions" />
          </UFormGroup>
          <UFormGroup label="IPA File" required>
            <input
              ref="ipaInput"
              type="file"
              accept=".ipa"
              class="file:mr-4 file:rounded-md file:border-0 file:bg-red-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
            />
          </UFormGroup>
        </div>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <span class="text-sm text-slate-600 dark:text-white/60">
              Bundle ID and version will be extracted automatically.
            </span>
            <UCheckbox v-model="uploadForm.signByAll" label="Sign by all moderators" />
          </div>
          <UButton
            type="submit"
            color="red"
            variant="solid"
            icon="i-heroicons-arrow-up-tray"
            :loading="uploading"
          >
            Upload App
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- All Apps List -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">All Uploaded Apps</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              size="sm"
              :loading="refreshing"
              @click="manualRefresh"
            />
            <UBadge color="gray" variant="soft">
              {{ apps?.length || 0 }} apps
            </UBadge>
          </div>
        </div>
      </template>

      <div v-if="!apps || apps.length === 0" class="text-center py-8 text-slate-500 dark:text-white/60">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No apps have been uploaded yet.</p>
        <p class="text-sm mt-1">Upload your first IPA using the form above.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="app in apps"
          :key="app.id"
          class="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 space-y-3"
        >
          <!-- App Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="font-semibold text-lg">{{ app.name }}</h3>
                <UBadge :color="app.platform === 'IOS' ? 'blue' : 'purple'" variant="soft">
                  {{ app.platform }}
                </UBadge>
              </div>
              <div class="text-sm text-slate-600 dark:text-white/60 mt-1 space-x-4">
                <span>{{ app.bundleId || 'Unknown bundle' }}</span>
                <span>v{{ app.version || '?' }}</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-white/40 mt-1">
                Uploaded by <span class="text-slate-600 dark:text-white/60 font-medium">{{ app.owner.nickname }}</span>
                on {{ formatDate(app.uploadedAt) }}
              </div>
            </div>
            <!-- Action buttons -->
            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-2">
                <!-- Release new version button -->
                <UButton
                  color="gray"
                  variant="soft"
                  icon="i-heroicons-arrow-up-on-square"
                  size="sm"
                  @click="openNewVersionModal(app)"
                >
                  Release New Version
                </UButton>
                <!-- Delete button -->
                <UButton
                  v-if="canDelete(app)"
                  color="red"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  size="sm"
                  :loading="deletingAppId === app.id"
                  @click="confirmDeleteApp(app)"
                />
              </div>
              <!-- Sign by all button -->
              <UButton
                color="orange"
                variant="soft"
                icon="i-heroicons-users"
                size="sm"
                :loading="signingAllAppId === app.id"
                @click="signByAllModerators(app.id)"
              >
                Sign by All
              </UButton>
              <!-- Sign button - different states based on user's signing status -->
              <UButton
                v-if="!mySignedVersion(app) || mySignedVersion(app)?.status === 'FAILED'"
                color="red"
                variant="solid"
                icon="i-heroicons-pencil-square"
                size="sm"
                :loading="signingAppId === app.id"
                @click="signApp(app.id)"
              >
                {{ mySignedVersion(app)?.status === 'FAILED' ? 'Retry signing' : 'Sign with my credentials' }}
              </UButton>
              <UButton
                v-else-if="mySignedVersion(app)?.status === 'SIGNING'"
                color="yellow"
                variant="soft"
                icon="i-heroicons-arrow-path"
                size="sm"
                disabled
              >
                Signing in progress...
              </UButton>
              <UButton
                v-else-if="mySignedVersion(app)?.status === 'SIGNED'"
                color="green"
                variant="soft"
                icon="i-heroicons-check-circle"
                size="sm"
                @click="signApp(app.id)"
              >
                Re-sign with my credentials
              </UButton>
            </div>
          </div>

          <!-- Signed Versions -->
          <div v-if="app.signedVersions.length > 0" class="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div class="text-xs text-slate-500 dark:text-white/50 mb-2 uppercase tracking-wider">Signed Versions</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="sv in app.signedVersions"
                :key="sv.id"
                class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                :class="statusClass(sv.status)"
              >
                <UIcon
                  :name="statusIcon(sv.status)"
                  class="w-4 h-4"
                />
                <span class="font-medium">{{ sv.signerName }}</span>
                <span v-if="sv.status === 'SIGNED'" class="text-slate-600 dark:text-white/60">
                  {{ formatDate(sv.signedAt) }}
                </span>
                <span v-else class="text-slate-600 dark:text-white/60">{{ sv.status }}</span>
                
                <!-- Install/Download buttons for signed versions -->
                <template v-if="sv.status === 'SIGNED'">
                  <UButton
                    v-if="app.platform === 'IOS'"
                    size="xs"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    :to="installLink(sv)"
                    target="_blank"
                  />
                  <UButton
                    v-else
                    size="xs"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    :to="downloadLink(sv)"
                    target="_blank"
                  />
                </template>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-slate-500 dark:text-white/40 mt-2">
            No signed versions yet
          </div>
        </div>
      </div>
    </UCard>

    <!-- New Version Modal -->
    <UModal v-model="showNewVersionModal">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-up-on-square" class="text-red-500" />
            <span class="font-semibold">Release New Version</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="uploadNewVersion">
          <div v-if="selectedApp" class="p-3 rounded-lg bg-slate-100 dark:bg-white/5">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ selectedApp.name }}</span>
              <UBadge :color="selectedApp.platform === 'IOS' ? 'blue' : 'purple'" variant="soft" size="xs">
                {{ selectedApp.platform }}
              </UBadge>
            </div>
            <div class="text-sm text-slate-600 dark:text-white/60 mt-1">
              Current: v{{ selectedApp.version }} • {{ selectedApp.bundleId }}
            </div>
          </div>

          <UFormGroup label="New IPA File" required>
            <input
              ref="newVersionIpaInput"
              type="file"
              accept=".ipa"
              class="file:mr-4 file:rounded-md file:border-0 file:bg-red-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
            />
          </UFormGroup>

          <UFormGroup>
            <UCheckbox v-model="newVersionForm.signByAll" label="Sign by all moderators automatically" />
            <template #hint>
              <span class="text-xs text-slate-500 dark:text-white/40">
                When enabled, the new version will be signed by all moderators who have valid certificates and profiles.
              </span>
            </template>
          </UFormGroup>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="gray"
              variant="ghost"
              @click="showNewVersionModal = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="red"
              variant="solid"
              icon="i-heroicons-arrow-up-tray"
              :loading="uploadingNewVersion"
            >
              Upload New Version
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 text-red-500">
            <UIcon name="i-heroicons-exclamation-triangle" />
            <span class="font-semibold">Delete App</span>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-slate-600 dark:text-white/70">
            Are you sure you want to delete this app? This action cannot be undone.
          </p>
          
          <div v-if="appToDelete" class="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <div class="flex items-center gap-2">
              <span class="font-medium text-red-700 dark:text-red-300">{{ appToDelete.name }}</span>
              <UBadge :color="appToDelete.platform === 'IOS' ? 'blue' : 'purple'" variant="soft" size="xs">
                {{ appToDelete.platform }}
              </UBadge>
            </div>
            <div class="text-sm text-red-600 dark:text-red-400 mt-1">
              v{{ appToDelete.version }} • {{ appToDelete.bundleId }}
            </div>
            <div v-if="appToDelete.signedVersions.length > 0" class="text-xs text-red-500 dark:text-red-400/80 mt-2">
              ⚠️ This will also delete {{ appToDelete.signedVersions.length }} signed version(s)
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="gray"
              variant="ghost"
              @click="showDeleteModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="red"
              variant="solid"
              icon="i-heroicons-trash"
              :loading="deletingAppId !== null"
              @click="deleteApp"
            >
              Delete App
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'All Apps', layout: 'default' })

const toast = useToast()
const { public: publicConfig } = useRuntimeConfig()

type SignedVersion = {
  id: string
  signerId: string
  signerName: string
  status: string
  signedAt: string | null
  signedIpaPath: string | null
  manifestPath: string | null
}

type AppRow = {
  id: string
  name: string
  bundleId: string
  version: string
  platform: 'IOS' | 'TVOS'
  uploadedAt: string
  owner: { id: string; nickname: string }
  signedVersions: SignedVersion[]
}

const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]

const { user: me } = useAuth()
if (!me.value || (me.value.role !== 'MANAGER' && me.value.role !== 'SUPERADMIN')) {
  navigateTo('/')
}

const { data: apps, refresh } = await useFetch<AppRow[]>('/api/admin/apps')

// Upload form state
const uploadForm = reactive({
  name: '',
  platform: 'IOS' as 'IOS' | 'TVOS',
  signByAll: false
})
const ipaInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

// Signing state
const signingAppId = ref<string | null>(null)
const signingAllAppId = ref<string | null>(null)
const refreshing = ref(false)

// New version modal state
const showNewVersionModal = ref(false)
const selectedApp = ref<AppRow | null>(null)
const newVersionForm = reactive({
  signByAll: true
})
const newVersionIpaInput = ref<HTMLInputElement | null>(null)
const uploadingNewVersion = ref(false)

// Delete modal state
const showDeleteModal = ref(false)
const appToDelete = ref<AppRow | null>(null)
const deletingAppId = ref<string | null>(null)

// Auto-refresh every 5 seconds to update signing status
let refreshInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshInterval = setInterval(() => {
    // Only auto-refresh if there are apps in signing state
    const hasPending = apps.value?.some(app => 
      app.signedVersions.some(sv => sv.status === 'SIGNING' || sv.status === 'PENDING')
    )
    if (hasPending) {
      refresh()
    }
  }, 5000)
})
onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

async function manualRefresh() {
  refreshing.value = true
  await refresh()
  refreshing.value = false
}

async function uploadIpa() {
  const file = ipaInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select an IPA file first', color: 'red' })
    return
  }
  if (!uploadForm.name.trim()) {
    toast.add({ title: 'App name is required', color: 'red' })
    return
  }

  uploading.value = true
  try {
    const body = new FormData()
    body.set('name', uploadForm.name.trim())
    body.set('platform', uploadForm.platform)
    body.set('ipa', file)
    
    const result = await $fetch<{ id: string }>('/api/apps/upload', { method: 'POST', body })
    
    toast.add({ 
      title: 'App uploaded successfully', 
      description: 'The app is now available for all moderators to sign.',
      color: 'green' 
    })
    
    // Sign by all if requested
    if (uploadForm.signByAll) {
      try {
        const signResult = await $fetch<{ queued: number; moderators: string[] }>(`/api/admin/apps/${result.id}/sign-all`, { method: 'POST' })
        toast.add({ 
          title: 'Signing queued for all moderators', 
          description: `${signResult.queued} moderators will sign this app`,
          color: 'green' 
        })
      } catch (e: any) {
        toast.add({ 
          title: 'Auto-sign failed', 
          description: e?.data?.message || 'Moderators can still sign manually',
          color: 'yellow' 
        })
      }
    }
    
    // Reset form
    uploadForm.name = ''
    uploadForm.platform = 'IOS'
    uploadForm.signByAll = false
    if (ipaInput.value) ipaInput.value.value = ''
    
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Upload failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    uploading.value = false
  }
}

// Check if current user has already signed this app
function mySignedVersion(app: AppRow): SignedVersion | undefined {
  return app.signedVersions.find(sv => sv.signerId === me.value?.id)
}

async function signApp(appId: string) {
  try {
    signingAppId.value = appId
    await $fetch(`/api/admin/apps/${appId}/sign`, { method: 'POST' })
    toast.add({ 
      title: 'Signing started', 
      description: 'Your signed version will appear shortly.',
      color: 'green' 
    })
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Signing failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    signingAppId.value = null
  }
}

async function signByAllModerators(appId: string) {
  try {
    signingAllAppId.value = appId
    const result = await $fetch<{ queued: number; moderators: string[] }>(`/api/admin/apps/${appId}/sign-all`, { method: 'POST' })
    toast.add({ 
      title: 'Signing queued for all moderators', 
      description: `${result.queued} moderators: ${result.moderators.join(', ')}`,
      color: 'green' 
    })
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Sign by all failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    signingAllAppId.value = null
  }
}

function openNewVersionModal(app: AppRow) {
  selectedApp.value = app
  newVersionForm.signByAll = true
  showNewVersionModal.value = true
}

async function uploadNewVersion() {
  const file = newVersionIpaInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select an IPA file first', color: 'red' })
    return
  }
  if (!selectedApp.value) {
    toast.add({ title: 'No app selected', color: 'red' })
    return
  }

  uploadingNewVersion.value = true
  try {
    const body = new FormData()
    body.set('appId', selectedApp.value.id)
    body.set('name', selectedApp.value.name)
    body.set('platform', selectedApp.value.platform)
    body.set('ipa', file)
    
    const result = await $fetch<{ id: string }>('/api/apps/upload', { method: 'POST', body })
    
    toast.add({ 
      title: 'New version uploaded successfully', 
      description: 'The app has been updated with the new IPA.',
      color: 'green' 
    })
    
    // Sign by all if requested
    if (newVersionForm.signByAll) {
      try {
        const signResult = await $fetch<{ queued: number; moderators: string[] }>(`/api/admin/apps/${result.id}/sign-all`, { method: 'POST' })
        toast.add({ 
          title: 'Signing queued for all moderators', 
          description: `${signResult.queued} moderators will sign this version`,
          color: 'green' 
        })
      } catch (e: any) {
        toast.add({ 
          title: 'Auto-sign failed', 
          description: e?.data?.message || 'Moderators can still sign manually',
          color: 'yellow' 
        })
      }
    }
    
    // Reset and close
    showNewVersionModal.value = false
    selectedApp.value = null
    if (newVersionIpaInput.value) newVersionIpaInput.value.value = ''
    
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Upload failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    uploadingNewVersion.value = false
  }
}

// Check if user can delete this app (owner or SUPERADMIN)
function canDelete(app: AppRow): boolean {
  if (!me.value) return false
  return app.owner.id === me.value.id || me.value.role === 'SUPERADMIN'
}

function confirmDeleteApp(app: AppRow) {
  appToDelete.value = app
  showDeleteModal.value = true
}

async function deleteApp() {
  if (!appToDelete.value) return
  
  deletingAppId.value = appToDelete.value.id
  try {
    await $fetch(`/api/admin/apps/${appToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ 
      title: 'App deleted', 
      description: `${appToDelete.value.name} has been deleted.`,
      color: 'green' 
    })
    
    showDeleteModal.value = false
    appToDelete.value = null
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Delete failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    deletingAppId.value = null
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusClass(status: string) {
  switch (status) {
    case 'SIGNED':
      return 'bg-green-500/20 text-green-300'
    case 'SIGNING':
      return 'bg-yellow-500/20 text-yellow-300'
    case 'FAILED':
      return 'bg-red-500/20 text-red-300'
    default:
      return 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-white/60'
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'SIGNED':
      return 'i-heroicons-check-circle'
    case 'SIGNING':
      return 'i-heroicons-arrow-path'
    case 'FAILED':
      return 'i-heroicons-x-circle'
    default:
      return 'i-heroicons-clock'
  }
}

function installLink(sv: SignedVersion) {
  if (!sv.manifestPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const manifestUrl = `${origin}/api/manifest/${sv.id}`
  return `itms-services://?action=download-manifest&url=${manifestUrl}`
}

function downloadLink(sv: SignedVersion) {
  if (!sv.signedIpaPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/api/download${sv.signedIpaPath}`
}
</script>
