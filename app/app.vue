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
useHead({
  titleTemplate: (title) => (title ? `${title} · AutoSigner` : 'AutoSigner'),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ]
})
</script>




