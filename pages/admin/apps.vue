<template>
  <div class="space-y-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">All Uploaded Apps</span>
          </div>
          <UBadge color="white" variant="soft">
            {{ apps?.length || 0 }} apps
          </UBadge>
        </div>
      </template>

      <div v-if="!apps || apps.length === 0" class="text-center py-8 text-white/60">
        No apps have been uploaded yet.
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
                <span>{{ app.bundleId }}</span>
                <span>v{{ app.version }}</span>
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

const { data: me } = await useFetch<{ id: string; role: string } | null>('/api/auth/me')
if (!me.value || (me.value.role !== 'MANAGER' && me.value.role !== 'SUPERADMIN')) {
  navigateTo('/')
}

const { data: apps, refresh } = await useFetch<AppRow[]>('/api/admin/apps')

const signingAppId = ref<string | null>(null)

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

