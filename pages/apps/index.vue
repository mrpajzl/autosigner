<template>
  <div>
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">My Apps</span>
          </div>
          <UButton to="/upload" icon="i-heroicons-arrow-up-tray" color="white" variant="soft" label="Upload" />
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


