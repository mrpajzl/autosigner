<template>
  <div>
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">My Apps</span>
          </div>
          <div class="flex gap-2">
            <UButton to="/apps/new" icon="i-heroicons-plus-circle" color="white" variant="soft" label="New App" />
            <UButton to="/upload" icon="i-heroicons-arrow-up-tray" color="white" variant="soft" label="Legacy Upload" />
          </div>
        </div>
      </template>
      <UTable :rows="apps" :columns="columns" class="min-w-full" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'My Apps', layout: 'default' })
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'bundleId', label: 'Bundle ID' },
  { key: 'version', label: 'Version' },
  { key: 'status', label: 'Status' },
  { key: 'platform', label: 'Platform' },
  { key: 'actions', label: 'Actions' }
]
const { data: apps } = await useFetch('/api/apps')
</script>


