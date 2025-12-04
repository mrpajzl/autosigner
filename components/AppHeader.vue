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
        <nav class="hidden md:flex items-center gap-3 text-sm text-slate-600 dark:text-white/80">
          <!-- Guides dropdown - visible to everyone -->
          <UDropdown :items="guidesMenu" :popper="{ placement: 'bottom-start' }">
            <button class="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
              Návody
              <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
            </button>
          </UDropdown>
          <ClientOnly>
            <NuxtLink
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              to="/admin/apps"
              class="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Manage Apps
            </NuxtLink>
            <NuxtLink
              v-if="me?.role === 'SUPERADMIN'"
              to="/admin/approvals"
              class="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Users
            </NuxtLink>
          </ClientOnly>
        </nav>
      </div>
      <div class="flex items-center gap-2">
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
          </div>
          
          <ClientOnly>
            <NuxtLink
              v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'"
              to="/admin/apps"
              class="px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              Manage Apps
            </NuxtLink>
            <NuxtLink
              v-if="me?.role === 'SUPERADMIN'"
              to="/admin/approvals"
              class="px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              @click="mobileOpen = false"
            >
              Users
            </NuxtLink>
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
  { label: 'Hackintosh ve VMware', icon: 'i-heroicons-computer-desktop', to: '/guides/hackintosh-vmware' }
]]

const userMenu = computed(() => [[
  { label: 'Profile', icon: 'i-heroicons-user', to: '/profile' },
  { label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: async () => { await logout(); navigateTo('/') } }
]])
</script>


