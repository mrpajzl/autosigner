<template>
  <header class="sticky top-0 z-40 glass border-b border-[color:var(--app-border)]">
    <div class="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Mobile menu button -->
        <UButton 
          icon="i-heroicons-bars-3" 
          variant="ghost" 
          color="gray"
          class="md:hidden" 
          @click="mobileOpen = true" 
        />
        <UIcon name="i-heroicons-sparkles" class="text-primary-400 hidden md:block" size="22" />
        <NuxtLink to="/" class="font-semibold">FastSigner</NuxtLink>
        <nav class="hidden md:flex items-center gap-4 text-sm text-slate-600 dark:text-white/80">
          <!-- Guides dropdown - visible to everyone -->
          <UDropdown :items="guidesMenu" :popper="{ placement: 'bottom-start' }">
            <button class="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors">
              <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
              Návody
              <UIcon name="i-heroicons-chevron-down" class="w-3 h-3" />
            </button>
          </UDropdown>
          <ClientOnly>
            <NuxtLink
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              to="/admin/apps"
              class="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4" />
              Manage Apps
            </NuxtLink>
            <NuxtLink
              v-if="me?.role === 'SUPERADMIN'"
              to="/admin/approvals"
              class="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
              Mods
            </NuxtLink>
            <NuxtLink
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              to="/profile/user-database"
              class="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <UIcon name="i-heroicons-users" class="w-4 h-4" />
              User Database
            </NuxtLink>
            <!-- Apple Developer dropdown -->
            <UDropdown
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              :items="appleMenu"
              :popper="{ placement: 'bottom-start' }"
            >
              <button class="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors">
                <UIcon name="i-simple-icons-apple" class="w-4 h-4" />
                Developer
                <span 
                  class="w-1.5 h-1.5 rounded-full" 
                  :class="appleConnected ? 'bg-green-500' : 'bg-gray-400'"
                />
                <UIcon name="i-heroicons-chevron-down" class="w-3 h-3" />
              </button>
            </UDropdown>
          </ClientOnly>
        </nav>
      </div>
      <div class="flex items-center gap-2">
        <!-- Sync notification -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <span 
            v-if="syncMessage" 
            class="text-xs px-2 py-1 rounded-full"
            :class="syncMessage.includes('failed') || syncMessage.includes('No valid') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'"
          >
            {{ syncMessage }}
          </span>
        </Transition>
        <UButton icon="i-heroicons-moon" variant="ghost" color="gray" @click="toggleTheme" />
        <ClientOnly>
          <template v-if="me">
            <UDropdown :items="userMenu">
              <UButton color="gray" variant="outline" icon="i-heroicons-user-circle" :label="me.nickname" />
            </UDropdown>
          </template>
          <template #fallback>
            <UButton color="gray" variant="outline" icon="i-heroicons-user-circle" loading />
          </template>
        </ClientOnly>
      </div>
    </div>
    
    <!-- Mobile slideover menu -->
    <USlideover v-model="mobileOpen">
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-sparkles" class="text-primary-400" size="28" />
          <span class="font-semibold tracking-wide">FastSigner</span>
        </div>
        <nav class="flex flex-col gap-2 text-slate-600 dark:text-slate-200">
          <!-- Guides section - visible to everyone -->
          <div class="px-3 py-2">
            <div class="flex items-center gap-2 text-sm font-medium text-slate-400 dark:text-white/50 mb-2">
              <UIcon name="i-heroicons-book-open" class="w-4 h-4" />
              Návody
            </div>
            <NuxtLink
              to="/guides/ios-mac-installation"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-device-phone-mobile" class="w-4 h-4 text-blue-500" />
              Instalace na iOS a Mac
            </NuxtLink>
            <NuxtLink
              to="/guides/apple-tv-sideloading"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-tv" class="w-4 h-4 text-red-500" />
              Sideloading na Apple TV
            </NuxtLink>
            <NuxtLink
              to="/guides/self-signing"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-emerald-500" />
              Vlastní podepisování
            </NuxtLink>
            <NuxtLink
              to="/guides/hackintosh-vmware"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-computer-desktop" class="w-4 h-4 text-orange-500" />
              Hackintosh ve VMware
            </NuxtLink>
            <NuxtLink
              to="/guides/macbook-udid"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-finger-print" class="w-4 h-4 text-slate-500" />
              UDID MacBooku
            </NuxtLink>
          </div>
          
          <ClientOnly>
            <NuxtLink
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              to="/admin/apps"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4 text-violet-500" />
              Manage Apps
            </NuxtLink>
            <NuxtLink
              v-if="me?.role === 'SUPERADMIN'"
              to="/admin/approvals"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-amber-500" />
              Mods
            </NuxtLink>
            <NuxtLink
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              to="/profile/user-database"
              class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              <UIcon name="i-heroicons-users" class="w-4 h-4 text-cyan-500" />
              User Database
            </NuxtLink>
            
            <!-- Apple Developer section -->
            <div v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'" class="px-3 py-2 mt-2">
              <div class="flex items-center justify-between text-sm font-medium text-slate-400 dark:text-white/50 mb-2">
                <div class="flex items-center gap-2">
                  <UIcon name="i-simple-icons-apple" class="w-4 h-4" />
                  Developer
                </div>
                <span 
                  class="text-xs px-1.5 py-0.5 rounded-full"
                  :class="appleConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'"
                >
                  {{ appleConnected ? 'Connected' : 'Not Connected' }}
                </span>
              </div>
              
              <!-- Not connected - show connect link -->
              <template v-if="!appleConnected">
                <NuxtLink
                  to="/profile/apple-developer"
                  class="flex items-center gap-2 px-3 py-2 rounded bg-orange-500/10 hover:bg-orange-500/20 transition-colors text-orange-400"
                  @click="mobileOpen = false"
                >
                  <UIcon name="i-heroicons-link" class="w-4 h-4" />
                  Connect Account
                </NuxtLink>
              </template>
              
              <!-- Connected - show all options -->
              <template v-else>
                <NuxtLink
                  to="/profile/apple-developer"
                  class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  @click="mobileOpen = false"
                >
                  <UIcon name="i-heroicons-key" class="w-4 h-4 text-slate-500" />
                  API Credentials
                </NuxtLink>
                <NuxtLink
                  to="/profile/devices"
                  class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  @click="mobileOpen = false"
                >
                  <UIcon name="i-heroicons-device-phone-mobile" class="w-4 h-4 text-blue-500" />
                  Devices
                </NuxtLink>
                <NuxtLink
                  to="/profile/apple-profiles"
                  class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  @click="mobileOpen = false"
                >
                  <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-green-500" />
                  Profiles
                </NuxtLink>
                <button
                  class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors w-full text-left"
                  :disabled="syncing"
                  @click="handleQuickSync"
                >
                  <UIcon :name="syncing ? 'i-heroicons-arrow-path' : 'i-heroicons-cloud-arrow-down'" :class="['w-4 h-4 text-red-500', syncing && 'animate-spin']" />
                  {{ syncing ? 'Syncing...' : 'Quick Sync Profiles' }}
                </button>
              </template>
            </div>
          </ClientOnly>
        </nav>
      </div>
    </USlideover>
  </header>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const mobileOpen = ref(false)
const { user: me, logout } = useAuth()
const toggleTheme = () => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }

const guidesMenu = [[
  { label: 'Instalace na iOS a Mac', icon: 'i-heroicons-device-phone-mobile', to: '/guides/ios-mac-installation' },
  { label: 'Sideloading na Apple TV', icon: 'i-heroicons-tv', to: '/guides/apple-tv-sideloading' },
  { label: 'Vlastní podepisování', icon: 'i-heroicons-pencil-square', to: '/guides/self-signing' },
  { label: 'Hackintosh ve VMware', icon: 'i-heroicons-computer-desktop', to: '/guides/hackintosh-vmware' },
  { label: 'UDID MacBooku', icon: 'i-heroicons-finger-print', to: '/guides/macbook-udid' }
]]

// Apple connection status
const { data: appleStatus } = useFetch('/api/apple/credentials', { lazy: true })
const appleConnected = computed(() => appleStatus.value?.connected ?? false)
const syncing = ref(false)
const syncMessage = ref('')

async function handleQuickSync() {
  if (syncing.value) return
  syncing.value = true
  syncMessage.value = ''
  
  try {
    const result = await $fetch<{ success: boolean; message: string }>('/api/apple/quick-sync', { method: 'POST' })
    syncMessage.value = result.message
    // Clear message after 3 seconds
    setTimeout(() => { syncMessage.value = '' }, 3000)
  } catch (e: any) {
    syncMessage.value = e?.data?.message || 'Sync failed'
    setTimeout(() => { syncMessage.value = '' }, 5000)
  } finally {
    syncing.value = false
  }
}

const appleMenu = computed(() => {
  if (!appleConnected.value) {
    // Not connected - only show connect option
    return [[
      { 
        label: 'Not Connected', 
        icon: 'i-heroicons-exclamation-circle', 
        disabled: true,
        class: 'text-orange-500 opacity-70'
      },
      { 
        label: 'Connect Account', 
        icon: 'i-heroicons-link', 
        to: '/profile/apple-developer'
      }
    ]]
  }
  
  // Connected - show all options
  return [
    [
      { 
        label: 'Connected', 
        icon: 'i-heroicons-check-circle', 
        disabled: true,
        class: 'text-green-500 opacity-70'
      }
    ],
    [
      { label: 'API Credentials', icon: 'i-heroicons-key', to: '/profile/apple-developer' },
      { label: 'Devices', icon: 'i-heroicons-device-phone-mobile', to: '/profile/devices' },
      { label: 'Profiles', icon: 'i-heroicons-document-text', to: '/profile/apple-profiles' }
    ],
    [
      { 
        label: syncing.value ? 'Syncing...' : 'Quick Sync Profiles', 
        icon: syncing.value ? 'i-heroicons-arrow-path' : 'i-heroicons-cloud-arrow-down',
        click: handleQuickSync,
        disabled: syncing.value,
        class: syncing.value ? 'animate-pulse' : ''
      }
    ]
  ]
})

const userMenu = computed(() => [[
  { label: 'Profile', icon: 'i-heroicons-user', to: '/profile' },
  { label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: async () => { await logout(); navigateTo('/') } }
]])
</script>


