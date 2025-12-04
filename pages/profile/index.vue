<template>
  <div class="space-y-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" />
            <span class="font-semibold">Signing Assets</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <UButton to="/profile/certificates" color="red" variant="solid" icon="i-heroicons-identification" label="Certificates" />
          <UButton to="/profile/profiles" color="red" variant="solid" icon="i-heroicons-document-text" label="Provisioning Profiles" />
        </div>
        <p class="text-sm text-slate-600 dark:text-white/60">Manage signing assets separately. Active assets will be used for automatic background signing of your apps.</p>
      </div>
    </UCard>

    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-building-storefront" />
            <span class="font-semibold">Apple Developer Integration</span>
          </div>
          <UBadge v-if="appleConnected" color="green" variant="soft">Connected</UBadge>
          <UBadge v-else color="gray" variant="soft">Not Connected</UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-white/60">
          Connect your Apple Developer account to manage devices (UDIDs) and provisioning profiles directly from this app.
          This is optional - you can still upload profiles manually.
        </p>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UButton
            to="/profile/apple-developer"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-key"
            label="API Credentials"
          />
          <UButton
            to="/profile/devices"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-device-phone-mobile"
            label="Devices"
            :disabled="!appleConnected"
          />
          <UButton
            to="/profile/apple-profiles"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-cloud-arrow-down"
            label="Apple Profiles"
            :disabled="!appleConnected"
          />
          <UButton
            to="/profile/user-database"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-users"
            label="User Database"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Profile', layout: 'default' })

const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)
</script>


