<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- User Header -->
    <div class="flex items-center gap-4">
      <img 
        v-if="user?.discordAvatar" 
        :src="user.discordAvatar" 
        alt="Avatar" 
        class="w-16 h-16 rounded-full"
      >
      <div>
        <h1 class="page-title">My Registrations</h1>
        <p class="text-sm text-slate-600 dark:text-white/60">
          Welcome, {{ user?.discordUsername || user?.nickname || 'Discord User' }}
        </p>
      </div>
    </div>

    <!-- No Registrations Found -->
    <UAlert
      v-if="!pending && (!data?.moderators || data.moderators.length === 0)"
      icon="i-heroicons-information-circle"
      color="blue"
      variant="soft"
      title="No Registrations Found"
    >
      <template #description>
        <p class="mb-2">
          You don't have any device registrations yet. Contact a moderator to get registered.
        </p>
        <p class="text-sm">
          Your Discord ID: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ user?.discordId }}</code>
        </p>
      </template>
    </UAlert>

    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Moderators List -->
    <div v-else class="space-y-6">
      <UCard 
        v-for="moderator in data?.moderators" 
        :key="moderator.moderatorId"
        class="glass"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                {{ moderator.moderatorDisplayName }}
              </h2>
              <p v-if="moderator.moderatorCompany" class="text-sm text-slate-600 dark:text-white/60">
                {{ moderator.moderatorCompany }}
              </p>
            </div>
            <UBadge 
              :color="hasActivePaidStatus(moderator) ? 'green' : 'gray'" 
              variant="subtle"
              size="lg"
            >
              {{ hasActivePaidStatus(moderator) ? 'Paid' : 'Unpaid' }}
            </UBadge>
          </div>
        </template>

        <!-- Registrations under this moderator -->
        <div class="space-y-4">
          <div 
            v-for="registration in moderator.registrations" 
            :key="registration.id"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="font-semibold text-slate-900 dark:text-white">
                  {{ registration.discordName }}
                </div>
                <div v-if="registration.notes" class="text-sm text-slate-600 dark:text-white/60 mt-1">
                  {{ registration.notes }}
                </div>
              </div>
              <UBadge 
                :color="registration.paidForNextYear ? 'emerald' : 'orange'" 
                variant="subtle"
              >
                {{ registration.paidForNextYear ? 'Paid for Next Year' : 'Payment Due' }}
              </UBadge>
            </div>

            <!-- Devices -->
            <div v-if="registration.devices.length > 0" class="mt-3">
              <div class="text-sm font-medium text-slate-700 dark:text-white/80 mb-2">
                Devices ({{ registration.devices.length }})
              </div>
              <div class="space-y-2">
                <div 
                  v-for="device in registration.devices" 
                  :key="device.id"
                  class="flex items-center gap-3 text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
                >
                  <UIcon 
                    :name="getPlatformIcon(device.platform)" 
                    class="w-5 h-5 text-slate-600 dark:text-white/60"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-slate-900 dark:text-white">
                      {{ device.name }}
                    </div>
                    <div class="text-xs text-slate-600 dark:text-white/60 font-mono">
                      {{ device.udid }}
                    </div>
                  </div>
                  <UBadge variant="subtle" size="xs">
                    {{ device.platform }}
                  </UBadge>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-slate-500 dark:text-white/50 italic">
              No devices registered yet
            </div>

            <!-- Registration dates -->
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-slate-500 dark:text-white/50">
              Registered: {{ formatDate(registration.createdAt) }}
              <span v-if="registration.updatedAt !== registration.createdAt" class="ml-3">
                Updated: {{ formatDate(registration.updatedAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <template #footer>
          <div class="flex items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user" class="w-4 h-4 text-slate-600 dark:text-white/60" />
              <span class="text-slate-600 dark:text-white/60">
                {{ moderator.registrations.length }} {{ moderator.registrations.length === 1 ? 'registration' : 'registrations' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-device-phone-mobile" class="w-4 h-4 text-slate-600 dark:text-white/60" />
              <span class="text-slate-600 dark:text-white/60">
                {{ getTotalDevices(moderator) }} {{ getTotalDevices(moderator) === 1 ? 'device' : 'devices' }}
              </span>
            </div>
          </div>
        </template>
      </UCard>

      <!-- Apps Section -->
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">Available Apps</span>
          </div>
        </template>
        <div class="text-sm text-slate-600 dark:text-white/60">
          <p class="mb-3">You can install signed apps from your moderators:</p>
          <UButton 
            to="/" 
            color="primary" 
            variant="soft"
            icon="i-heroicons-arrow-down-tray"
          >
            Browse Available Apps
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, refresh: refreshAuth } = useAuth()

// Make sure we have the latest user data
await refreshAuth()

// Fetch user's registrations
const { data, pending } = await useFetch('/api/my-registrations')

function hasActivePaidStatus(moderator: any) {
  return moderator.registrations.some((r: any) => r.paidForNextYear)
}

function getTotalDevices(moderator: any) {
  return moderator.registrations.reduce((sum: number, r: any) => sum + r.devices.length, 0)
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'IOS':
      return 'i-heroicons-device-phone-mobile'
    case 'APPLE_TV':
      return 'i-heroicons-tv'
    case 'MAC_OS':
      return 'i-heroicons-computer-desktop'
    default:
      return 'i-heroicons-device-phone-mobile'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

