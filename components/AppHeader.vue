<template>
  <header class="sticky top-0 z-40 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-sparkles" class="text-primary-400" size="22" />
        <NuxtLink to="/" class="font-semibold">AutoSigner</NuxtLink>
        <nav class="hidden md:flex items-center gap-3 text-sm text-white/80">
          <NuxtLink to="/" class="hover:text-white">Dashboard</NuxtLink>
          <NuxtLink to="/apps" class="hover:text-white">Apps</NuxtLink>
          <NuxtLink to="/upload" class="hover:text-white">Upload</NuxtLink>
          <NuxtLink to="/admin/approvals" class="hover:text-white">Approvals</NuxtLink>
        </nav>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-moon" variant="ghost" color="white" @click="toggleTheme" />
        <template v-if="me">
          <UDropdown :items="userMenu">
            <UButton color="white" variant="soft" icon="i-heroicons-user-circle" :label="me.email" />
          </UDropdown>
        </template>
        <template v-else>
          <UButton to="/auth/login" color="white" variant="soft" icon="i-heroicons-arrow-right-end-on-rectangle" label="Sign in" />
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const toggleTheme = () => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }
const { data: me } = await useFetch<{ id: string; email: string } | null>('/api/auth/me')
const userMenu = [[
  { label: 'Profile', icon: 'i-heroicons-user' },
  { label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: async () => { await $fetch('/api/auth/signout', { method: 'POST' }); navigateTo('/') } }
]]
</script>


