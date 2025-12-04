<template>
  <div class="min-h-dvh text-slate-900 dark:text-slate-100 transition-colors">
    <NuxtLoadingIndicator color="#6366f1" :height="3" />
    <AppHeader />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'

// Initialize auth during SSR - this ensures user state is available immediately
// Await the asyncData to block SSR until auth is resolved
const { asyncData } = useAuth()
await asyncData

useHead({
  titleTemplate: (title) => (title ? `${title} · FastSigner` : 'FastSigner'),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ]
})
</script>




