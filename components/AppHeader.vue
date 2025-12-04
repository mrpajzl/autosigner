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
          <template v-else>
            <UButton to="/auth/login" color="gray" variant="outline" icon="i-heroicons-arrow-right-end-on-rectangle" label="Sign in" />
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
const userMenu = computed(() => [[
  { label: 'Profile', icon: 'i-heroicons-user', to: '/profile' },
  { label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: async () => { await logout(); navigateTo('/') } }
]])
</script>


