<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Mobile menu button -->
        <UButton 
          icon="i-heroicons-bars-3" 
          variant="ghost" 
          color="white" 
          class="md:hidden" 
          @click="mobileOpen = true" 
        />
        <UIcon name="i-heroicons-sparkles" class="text-primary-400 hidden md:block" size="22" />
        <NuxtLink to="/" class="font-semibold">AutoSigner</NuxtLink>
        <nav class="hidden md:flex items-center gap-3 text-sm text-white/80">
          <NuxtLink v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'" to="/admin/apps" class="hover:text-white">Manage Apps</NuxtLink>
          <NuxtLink v-if="me?.role === 'SUPERADMIN'" to="/admin/approvals" class="hover:text-white">Users</NuxtLink>
        </nav>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-moon" variant="ghost" color="white" @click="toggleTheme" />
        <template v-if="me">
          <UDropdown :items="userMenu">
            <UButton color="white" variant="soft" icon="i-heroicons-user-circle" :label="me.nickname" />
          </UDropdown>
        </template>
        <template v-else>
          <UButton to="/auth/login" color="white" variant="soft" icon="i-heroicons-arrow-right-end-on-rectangle" label="Sign in" />
        </template>
      </div>
    </div>
    
    <!-- Mobile slideover menu -->
    <USlideover v-model="mobileOpen">
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-sparkles" class="text-primary-400" size="28" />
          <span class="font-semibold tracking-wide">AutoSigner</span>
        </div>
        <nav class="flex flex-col gap-2">
          <NuxtLink v-if="me?.role === 'MANAGER' || me?.role === 'SUPERADMIN'" to="/admin/apps" class="px-3 py-2 rounded hover:bg-white/10" @click="mobileOpen = false">Manage Apps</NuxtLink>
          <NuxtLink v-if="me?.role === 'SUPERADMIN'" to="/admin/approvals" class="px-3 py-2 rounded hover:bg-white/10" @click="mobileOpen = false">Users</NuxtLink>
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


