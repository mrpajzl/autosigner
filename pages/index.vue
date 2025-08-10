<template>
  <div class="space-y-10">
    <div class="text-center">
      <h1 class="text-3xl font-semibold tracking-wide">App Dashboard</h1>
      <p class="text-white/70">Sections below list apps published by each moderator.</p>
    </div>

    <div v-if="moderators.length === 0" class="text-center text-white/70">
      No moderators or apps available yet.
    </div>

    <div v-for="mod in moderators" :key="mod.id" class="grid gap-6 md:grid-cols-3">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-computer-desktop" class="text-red-500" />
            <div>
              <p class="font-semibold">Apple TV</p>
              <p class="text-xs text-white/60">Moderator: {{ mod.name }}</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="app in mod.tvosApps" :key="app.id" class="flex items-center justify-between">
            <UButton :to="tvosLink(app)" target="_blank" :disabled="app.status !== 'SIGNED'" color="red" variant="solid">{{ app.name }} {{ app.version }}</UButton>
            <span class="text-xs text-white/60">{{ formatDate(app.uploadedAt) }}</span>
          </div>
          <p v-if="mod.tvosApps.length === 0" class="text-sm text-white/60">No tvOS apps.</p>
        </div>
      </UCard>

      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-device-phone-mobile" class="text-red-500" />
            <div>
              <p class="font-semibold">iPhone, iPad, Mac M1</p>
              <p class="text-xs text-white/60">Moderator: {{ mod.name }}</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="app in mod.iosApps" :key="app.id" class="flex items-center justify-between">
            <UButton :to="installLink(app)" :disabled="app.status !== 'SIGNED'" color="red" variant="solid">{{ app.name }} {{ app.version }}</UButton>
            <span class="text-xs text-white/60">{{ formatDate(app.uploadedAt) }}</span>
          </div>
          <p v-if="mod.iosApps.length === 0" class="text-sm text-white/60">No iOS apps.</p>
        </div>
      </UCard>

      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-identification" class="text-red-500" />
            <div>
              <p class="font-semibold">Certifikáty, Profily</p>
              <p class="text-xs text-white/60">Moderator: {{ mod.name }}</p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <UButton color="red" variant="solid" :disabled="!mod.profileAvailable">Certifikát</UButton>
            <span class="text-xs text-white/60">{{ formatDate(mod.profileUpdatedAt) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <UButton color="red" variant="solid" :disabled="!mod.profileAvailable">Profil</UButton>
            <span class="text-xs text-white/60">{{ formatDate(mod.profileUpdatedAt) }}</span>
          </div>
        </div>
      </UCard>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// eslint-disable-next-line no-undef
declare const useRuntimeConfig: any

type PublicApp = { id: string; name: string; version: string; platform: 'IOS' | 'TVOS'; uploadedAt: string; manifestPath?: string | null; downloadPath?: string | null; status: string }
type PublicModerator = {
  id: string
  name: string
  iosApps: PublicApp[]
  tvosApps: PublicApp[]
  profileUpdatedAt: string | null
  profileAvailable: boolean
}

const moderators = ref<PublicModerator[]>([])
const { public: publicConfig } = useRuntimeConfig()

function installLink(app: PublicApp) {
  if (!app.manifestPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const manifestUrl = `${origin}/api/manifest/${app.id}`
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`
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

onMounted(async () => {
  moderators.value = await $fetch<PublicModerator[]>('/api/public/moderators')
})
</script>
