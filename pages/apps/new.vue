<script setup lang="ts">
// Redirect to the new consolidated Apps page
definePageMeta({ layout: false })
navigateTo('/admin/apps', { replace: true })
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center">
    <p class="text-white/60">Redirecting...</p>
  </div>
</template>
