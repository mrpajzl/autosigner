<template>
  <div class="space-y-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" />
            <span class="font-semibold">Profile</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <UButton to="/profile/certificates" color="red" variant="solid" icon="i-heroicons-identification" label="Certificates" />
          <UButton to="/profile/profiles" color="red" variant="solid" icon="i-heroicons-document-text" label="Provisioning Profiles" />
        </div>
        <p class="text-sm text-white/60">Manage signing assets separately. Active assets will be used for automatic background signing of your apps.</p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Profile', layout: 'default' })
</script>


