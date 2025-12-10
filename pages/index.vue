<template>
  <div class="mt-10 px-5 max-w-7xl mx-auto space-y-10">
    <!-- Welcome Section -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-violet-500/10 to-red-500/10 dark:from-red-500/20 dark:via-violet-500/20 dark:to-red-500/20 p-5 md:p-8 border border-white/10">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/5 via-transparent to-transparent"></div>
      <div class="relative space-y-4 md:space-y-6">
        <div class="text-center space-y-2 md:space-y-3">
          <h1 class="text-2xl md:text-4xl font-bold bg-gradient-to-r from-red-500 to-violet-500 bg-clip-text text-transparent">
            Vítejte ve FastSigner
          </h1>
          <p class="text-sm md:text-lg text-slate-600 dark:text-white/70 max-w-2xl mx-auto">
            Vaše místo pro sideloading aplikací na Apple zařízení
          </p>
        </div>

        <!-- Mobile: compact horizontal layout -->
        <div class="flex md:hidden justify-center gap-6">
          <div class="flex flex-col items-center gap-1">
            <div class="p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <UIcon name="i-heroicons-device-phone-mobile" class="w-6 h-6 text-red-500" />
            </div>
            <span class="text-xs font-medium text-slate-700 dark:text-white/80">Aplikace</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-red-500" />
            </div>
            <span class="text-xs font-medium text-slate-700 dark:text-white/80">Certifikáty</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <UIcon name="i-heroicons-user-group" class="w-6 h-6 text-red-500" />
            </div>
            <span class="text-xs font-medium text-slate-700 dark:text-white/80">Komunita</span>
          </div>
        </div>
        
        <!-- Desktop: full cards layout -->
        <div class="hidden md:grid md:grid-cols-3 gap-4 text-center">
          <div class="p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <UIcon name="i-heroicons-device-phone-mobile" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 class="font-semibold text-slate-800 dark:text-white">Podepsané aplikace</h3>
            <p class="text-sm text-slate-500 dark:text-white/60">Pro iPhone, iPad, Apple TV a Mac</p>
          </div>
          <div class="p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <UIcon name="i-heroicons-shield-check" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 class="font-semibold text-slate-800 dark:text-white">Certifikáty & Profily</h3>
            <p class="text-sm text-slate-500 dark:text-white/60">Vše potřebné pro instalaci</p>
          </div>
          <div class="p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 class="font-semibold text-slate-800 dark:text-white">Komunita</h3>
            <p class="text-sm text-slate-500 dark:text-white/60">Podpora a novinky na Discordu</p>
          </div>
        </div>

        <div class="bg-violet-500/10 dark:bg-violet-500/20 rounded-xl p-4 md:p-5 border border-violet-500/20">
          <div class="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div class="flex items-start gap-2 md:gap-3">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5 md:w-6 md:h-6 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 class="font-semibold text-sm md:text-base text-slate-800 dark:text-white">Před prvním použitím</h3>
                <p class="text-xs md:text-sm text-slate-600 dark:text-white/70">
                  Pro registraci zařízení a získání přístupu je nutné se nejprve připojit na náš Discord server.
                </p>
              </div>
            </div>
            <UButton
              to="https://discord.gg/cSZhdNJTEf"
              target="_blank"
              color="violet"
              variant="solid"
              size="md"
              class="group flex-shrink-0 w-full md:w-auto justify-center"
            >
              <svg class="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Připojit se na Discord
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Skeleton Loading State -->
    <template v-if="pending">
      <!-- Skeleton moderator buttons -->
      <div class="flex flex-wrap justify-center gap-2">
        <USkeleton class="h-8 w-24 rounded-md" />
        <USkeleton class="h-8 w-28 rounded-md" />
        <USkeleton class="h-8 w-20 rounded-md" />
      </div>

      <!-- Skeleton moderator section -->
      <div v-for="i in 2" :key="i" class="grid gap-6 md:grid-cols-3">
        <div class="md:col-span-3 flex items-center gap-3">
          <USkeleton class="w-5 h-5 rounded" />
          <USkeleton class="h-6 w-32" />
        </div>
        
        <!-- Skeleton cards -->
        <UCard v-for="j in 3" :key="j" class="glass">
          <template #header>
            <div class="flex items-center gap-3">
              <USkeleton class="w-5 h-5 rounded" />
              <USkeleton class="h-5 w-32" />
            </div>
          </template>
          <div class="space-y-4">
            <div v-for="k in 2" :key="k" class="flex items-center gap-3">
              <USkeleton class="w-10 h-10 rounded-xl" />
              <USkeleton class="h-9 w-28 rounded-md" />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Quick scroll buttons -->
    <div v-else-if="moderators && moderators.length > 0" class="flex flex-wrap justify-center gap-2">
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

    <div v-else-if="!moderators || moderators.length === 0" class="text-center text-slate-500 dark:text-white/70">
      No moderators or apps available yet.
    </div>

    <div v-if="!pending" v-for="mod in moderators || []" :key="mod.id" :id="`moderator-${mod.id}`" class="grid gap-6 md:grid-cols-3 scroll-mt-24">
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
            <img
              v-if="app.iconPath"
              :src="`/api/download${app.iconPath}`"
              :alt="app.name"
              class="w-10 h-10 rounded-xl shadow-sm object-cover"
            />
            <div v-else class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center">
              <UIcon name="i-heroicons-tv" class="w-5 h-5 text-slate-400 dark:text-white/40" />
            </div>
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
            <img
              v-if="app.iconPath"
              :src="`/api/download${app.iconPath}`"
              :alt="app.name"
              class="w-10 h-10 rounded-xl shadow-sm object-cover"
            />
            <div v-else class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center">
              <UIcon name="i-heroicons-device-phone-mobile" class="w-5 h-5 text-slate-400 dark:text-white/40" />
            </div>
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
              <UBadge color="red" variant="soft">{{ mod.deviceCounts.total }}/100</UBadge>
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

    <!-- Footer Disclaimer -->
    <footer class="mt-16 pb-10 border-t border-slate-200 dark:border-white/10 pt-8">
      <div class="flex flex-col items-center gap-4 text-center">
        <UIcon name="i-heroicons-shield-exclamation" class="w-8 h-8 text-slate-400 dark:text-white/40" />
        <div class="max-w-2xl space-y-2">
          <h4 class="font-semibold text-slate-600 dark:text-white/70">Prohlášení o odpovědnosti</h4>
          <p class="text-sm text-slate-500 dark:text-white/50 leading-relaxed">
            Provozovatel tohoto webu nenese žádnou odpovědnost za obsah, funkčnost ani legálnost aplikací zde poskytovaných. 
            Aplikace jsou nahrávány třetími stranami a provozovatel není jejich autorem ani distributorem. 
            Používání aplikací je na vlastní riziko uživatele.
          </p>
        </div>
        <p class="text-xs text-slate-400 dark:text-white/30 mt-4">
          © {{ new Date().getFullYear() }} FastSigner
        </p>
      </div>
    </footer>
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

const { data: moderators, status } = useFetch<PublicModerator[]>('/api/public/moderators', { lazy: true })
const pending = computed(() => status.value === 'pending')
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
