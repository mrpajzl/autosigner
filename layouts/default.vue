<template>
  <div class="relative min-h-dvh">
    <aside class="fixed inset-y-0 left-0 w-72 p-4 hidden md:flex flex-col gap-4 glass text-slate-800 dark:text-slate-100">
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-sparkles" class="text-primary-400" size="28" />
        <span class="font-semibold tracking-wide">FastSigner</span>
      </div>
      <UVerticalNavigation :links="links" class="mt-2" />
      <div class="mt-auto text-xs text-slate-500 dark:text-white/60">
        <p>Signed securely with your certs.</p>
      </div>
    </aside>

    <div class="md:pl-72">
      <header class="sticky top-0 z-30 glass">
        <div class="mx-auto w-full max-w-7xl px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UButton icon="i-heroicons-bars-3" color="gray" variant="ghost" class="md:hidden" @click="mobileOpen = true" />
            <span class="font-medium">{{ pageTitle }}</span>
          </div>
          <div class="flex items-center gap-3">
            <UButton icon="i-heroicons-moon" variant="ghost" color="gray" @click="toggleTheme" />
            <div v-if="me">
              <UDropdown :items="userMenu">
                <UButton color="gray" variant="soft" icon="i-heroicons-user-circle" :label="me.nickname || me.email" />
              </UDropdown>
            </div>
            <div v-else>
              <UButton to="/auth/login" color="gray" variant="soft" icon="i-heroicons-arrow-right-end-on-rectangle" label="Sign in" />
            </div>
          </div>
        </div>
      </header>

      <main class="py-6">
        <div class="mx-auto w-full max-w-7xl px-4">
          <slot />
        </div>
      </main>
    </div>

    <USlideover v-model="mobileOpen">
      <div class="p-4 flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-sparkles" class="text-primary-400" size="28" />
          <span class="font-semibold tracking-wide">FastSigner</span>
        </div>
        <UVerticalNavigation :links="links" @select="mobileOpen = false" />
      </div>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const { user: me, logout } = useAuth()

const links = [
  { label: 'Manage Apps', icon: 'i-heroicons-rectangle-stack', to: '/admin/apps' },
  { label: 'Users', icon: 'i-heroicons-users', to: '/admin/approvals' }
]

const userMenu = computed(() => [[
  { label: 'Profile', icon: 'i-heroicons-user', to: '/profile' },
  { label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: async () => { await logout(); navigateTo('/') } }
]])

const pageTitle = computed(() => route.meta?.title ?? 'FastSigner')
const mobileOpen = ref(false)

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<style scoped>
</style>


