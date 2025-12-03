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
            color="white"
            variant="soft"
            icon="i-heroicons-identification"
            size="sm"
          >
            Manage Certificates & Profiles
          </UButton>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="uploadIpa">
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
        <div class="flex items-center justify-between">
          <span class="text-sm text-white/60">
            Bundle ID and version will be extracted automatically from the IPA.
          </span>
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
              color="white"
              variant="ghost"
              size="sm"
              :loading="refreshing"
              @click="manualRefresh"
            />
            <UBadge color="white" variant="soft">
              {{ apps?.length || 0 }} apps
            </UBadge>
          </div>
        </div>
      </template>

      <div v-if="!apps || apps.length === 0" class="text-center py-8 text-white/60">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No apps have been uploaded yet.</p>
        <p class="text-sm mt-1">Upload your first IPA using the form above.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="app in apps"
          :key="app.id"
          class="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3"
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
              <div class="text-sm text-white/60 mt-1 space-x-4">
                <span>{{ app.bundleId || 'Unknown bundle' }}</span>
                <span>v{{ app.version || '?' }}</span>
              </div>
              <div class="text-xs text-white/40 mt-1">
                Uploaded by <span class="text-white/60 font-medium">{{ app.owner.nickname }}</span>
                on {{ formatDate(app.uploadedAt) }}
              </div>
            </div>
            <!-- Sign button - different states based on user's signing status -->
            <div class="flex flex-col items-end gap-1">
              <UButton
                v-if="!mySignedVersion(app) || mySignedVersion(app)?.status === 'FAILED'"
                color="red"
                variant="solid"
                icon="i-heroicons-pencil-square"
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
                disabled
              >
                Signing in progress...
              </UButton>
              <UButton
                v-else-if="mySignedVersion(app)?.status === 'SIGNED'"
                color="green"
                variant="soft"
                icon="i-heroicons-check-circle"
                @click="signApp(app.id)"
              >
                Re-sign with my credentials
              </UButton>
            </div>
          </div>

          <!-- Signed Versions -->
          <div v-if="app.signedVersions.length > 0" class="mt-3 pt-3 border-t border-white/10">
            <div class="text-xs text-white/50 mb-2 uppercase tracking-wider">Signed Versions</div>
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
                <span v-if="sv.status === 'SIGNED'" class="text-white/60">
                  {{ formatDate(sv.signedAt) }}
                </span>
                <span v-else class="text-white/60">{{ sv.status }}</span>
                
                <!-- Install/Download buttons for signed versions -->
                <template v-if="sv.status === 'SIGNED'">
                  <UButton
                    v-if="app.platform === 'IOS'"
                    size="xs"
                    color="white"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    :to="installLink(sv)"
                    target="_blank"
                  />
                  <UButton
                    v-else
                    size="xs"
                    color="white"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    :to="downloadLink(sv)"
                    target="_blank"
                  />
                </template>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-white/40 mt-2">
            No signed versions yet
          </div>
        </div>
      </div>
    </UCard>
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
  platform: 'IOS' as 'IOS' | 'TVOS'
})
const ipaInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

// Signing state
const signingAppId = ref<string | null>(null)
const refreshing = ref(false)

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
    
    await $fetch('/api/apps/upload', { method: 'POST', body })
    
    toast.add({ 
      title: 'App uploaded successfully', 
      description: 'The app is now available for all moderators to sign.',
      color: 'green' 
    })
    
    // Reset form
    uploadForm.name = ''
    uploadForm.platform = 'IOS'
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
      return 'bg-white/10 text-white/60'
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
