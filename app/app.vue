<template>
  <div class="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-white">
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




