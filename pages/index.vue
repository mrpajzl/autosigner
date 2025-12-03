<template>
  <div class="mt-10 px-5 max-w-7xl mx-auto space-y-10">
    <!-- Quick scroll buttons -->
    <div v-if="moderators && moderators.length > 0" class="flex flex-wrap justify-center gap-2">
      <UButton
        v-for="mod in moderators"
        :key="mod.id"
        color="red"
        variant="soft"
        size="sm"
        @click="scrollToModerator(mod.id)"
      >
        <UIcon name="i-heroicons-user-circle" class="mr-1" />
        {{ mod.name }}
      </UButton>
    </div>

    <div v-if="!moderators || moderators.length === 0" class="text-center text-slate-500 dark:text-white/70">
      No moderators or apps available yet.
    </div>

    <div v-for="mod in moderators || []" :key="mod.id" :id="`moderator-${mod.id}`" class="grid gap-6 md:grid-cols-3 scroll-mt-24">
      <div class="md:col-span-3">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-user-circle" class="text-red-500" />
          <h2 class="text-xl font-semibold tracking-wide">{{ mod.name }}</h2>
        </div>
      </div>
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-computer-desktop" class="text-red-500" />
            <div>
              <p class="font-semibold">Apple TV</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="app in mod.tvosApps" :key="app.id" class="flex items-center gap-3">
            <UTooltip :text="`Uploaded: ${formatDate(app.uploadedAt)}`">
              <img
                v-if="app.iconPath"
                :src="`/api/download${app.iconPath}`"
                :alt="app.name"
                class="w-10 h-10 rounded-xl shadow-sm object-cover cursor-help"
              />
              <div v-else class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center cursor-help">
                <UIcon name="i-heroicons-tv" class="w-5 h-5 text-slate-400 dark:text-white/40" />
              </div>
            </UTooltip>
            <UButton :to="tvosLink(app)" target="_blank" :disabled="app.status !== 'SIGNED'" color="red" variant="solid">{{ app.name }} {{ displayVersion(app) }}</UButton>
          </div>
          <p v-if="mod.tvosApps.length === 0" class="text-sm text-slate-500 dark:text-white/60">No tvOS apps.</p>
        </div>
      </UCard>

      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-device-phone-mobile" class="text-red-500" />
            <div>
              <p class="font-semibold">iPhone, iPad, Mac M1</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="app in mod.iosApps" :key="app.id" class="flex items-center gap-3">
            <UTooltip :text="`Uploaded: ${formatDate(app.uploadedAt)}`">
              <img
                v-if="app.iconPath"
                :src="`/api/download${app.iconPath}`"
                :alt="app.name"
                class="w-10 h-10 rounded-xl shadow-sm object-cover cursor-help"
              />
              <div v-else class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center cursor-help">
                <UIcon name="i-heroicons-device-phone-mobile" class="w-5 h-5 text-slate-400 dark:text-white/40" />
              </div>
            </UTooltip>
            <UButton :to="installLink(app)" :disabled="app.status !== 'SIGNED'" color="red" variant="solid">{{ app.name }} {{ displayVersion(app) }}</UButton>
          </div>
          <p v-if="mod.iosApps.length === 0" class="text-sm text-slate-500 dark:text-white/60">No iOS apps.</p>
        </div>
      </UCard>

      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-identification" class="text-red-500" />
            <div>
              <p class="font-semibold">Certifikáty, Profily</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UButton color="red" variant="solid" :disabled="!mod.profileAvailable">Certifikát</UButton>
              <span v-if="mod.certificateExpiresAt" class="text-xs" :class="isCertExpiringSoon(mod.certificateExpiresAt) ? 'text-orange-400' : 'text-slate-500 dark:text-white/60'">
                Platnost do {{ formatDateShort(mod.certificateExpiresAt) }}
              </span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <UButton color="red" variant="solid" :disabled="!mod.profileAvailable">Profil</UButton>
            <span class="text-xs text-slate-500 dark:text-white/60">{{ formatDate(mod.profileUpdatedAt) }}</span>
          </div>
        </div>
      </UCard>

      <!-- Device Statistics -->
      <UCard v-if="mod.deviceCounts" class="glass md:col-span-3">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-device-phone-mobile" class="text-red-500" />
            <div class="flex items-center gap-2">
              <p class="font-semibold">Registrovaná zařízení</p>
              <UBadge color="red" variant="soft">{{ mod.deviceCounts.total }}</UBadge>
            </div>
          </div>
        </template>

        <div class="flex flex-wrap gap-3">
          <div v-if="mod.deviceCounts.iOS > 0" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5">
            <UIcon name="i-heroicons-device-phone-mobile" class="text-blue-500 dark:text-blue-400" />
            <span class="text-sm font-medium">iOS</span>
            <UBadge color="blue" variant="soft" size="xs">{{ mod.deviceCounts.iOS }}</UBadge>
          </div>
          <div v-if="mod.deviceCounts.APPLE_TV > 0" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5">
            <UIcon name="i-heroicons-tv" class="text-slate-500 dark:text-gray-400" />
            <span class="text-sm font-medium">Apple TV</span>
            <UBadge color="gray" variant="soft" size="xs">{{ mod.deviceCounts.APPLE_TV }}</UBadge>
          </div>
          <div v-if="mod.deviceCounts.MAC > 0" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5">
            <UIcon name="i-heroicons-computer-desktop" class="text-emerald-500 dark:text-green-400" />
            <span class="text-sm font-medium">Mac</span>
            <UBadge color="emerald" variant="soft" size="xs">{{ mod.deviceCounts.MAC }}</UBadge>
          </div>
          <div v-if="mod.deviceCounts.total === 0" class="text-sm text-slate-500 dark:text-white/60">
            Žádná registrovaná zařízení
          </div>
        </div>
      </UCard>
    </div>
  </div>
  
</template>

<script setup lang="ts">
type PublicApp = { id: string; name: string; version: string; buildNumber?: string | null; showBuildNumber: boolean; platform: 'IOS' | 'TVOS'; uploadedAt: string; manifestPath?: string | null; downloadPath?: string | null; status: string; iconPath?: string | null }
type DeviceCounts = {
  iOS: number      // iPhone + iPad
  APPLE_TV: number
  MAC: number
  total: number
}
type PublicModerator = {
  id: string
  name: string
  iosApps: PublicApp[]
  tvosApps: PublicApp[]
  profileUpdatedAt: string | null
  profileAvailable: boolean
  certificateExpiresAt: string | null
  deviceCounts: DeviceCounts | null
}

const { data: moderators } = await useFetch<PublicModerator[]>('/api/public/moderators')
const { public: publicConfig } = useRuntimeConfig()

function installLink(app: PublicApp) {
  if (!app.manifestPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const manifestUrl = `${origin}/api/manifest/${app.id}`
  return `itms-services://?action=download-manifest&url=${manifestUrl}`
}

function tvosLink(app: PublicApp) {
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const path = app.downloadPath || ''
  if (!path) return undefined
  return `${origin}${path}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDateShort(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

function isCertExpiringSoon(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  const daysUntilExpiry = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntilExpiry <= 30 // Warn if expiring within 30 days
}

function scrollToModerator(id: string) {
  const el = document.getElementById(`moderator-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function displayVersion(app: PublicApp) {
  const hasVersion = typeof app.version === 'string' && app.version.length > 0
  const hasBuild = typeof app.buildNumber === 'string' && app.buildNumber.length > 0
  
  if (hasVersion && hasBuild && app.showBuildNumber && app.version !== app.buildNumber) {
    return `v${app.version} (${app.buildNumber})`
  }
  return hasVersion ? `v${app.version}` : (hasBuild ? `v${app.buildNumber}` : '')
}
</script>
