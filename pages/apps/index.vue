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
          </div>
        </div>
      </template>
      <UTable :rows="apps" :columns="columns" class="min-w-full">
        <template #actions-data="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-heroicons-arrow-path"
              color="white"
              variant="soft"
              size="xs"
              :loading="resigningId === row.id"
              @click="onResign(row)"
            >
              Re-sign
            </UButton>
            <UButton
              icon="i-heroicons-arrow-up-on-square"
              color="white"
              variant="soft"
              size="xs"
              @click="onUploadVersion(row)"
            >
              Upload Version
            </UButton>
            <UButton
              icon="i-heroicons-trash"
              color="red"
              variant="soft"
              size="xs"
              :loading="deletingId === row.id"
              @click="onDelete(row)"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UTable>
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
const { data: me } = await useFetch<{ id: string; role: string } | null>('/api/auth/me')
if (!me.value || (me.value.role !== 'MANAGER' && me.value.role !== 'SUPERADMIN')) {
  navigateTo('/')
}
const { data: apps, refresh } = await useFetch('/api/apps')

const deletingId = ref<string | null>(null)
const resigningId = ref<string | null>(null)

function onUploadVersion(row: any) {
  const q = new URLSearchParams({
    appId: String(row.id || ''),
    name: String(row.name || ''),
    bundleId: String(row.bundleId || ''),
    version: String(row.version || ''),
    platform: String(row.platform || 'IOS')
  })
  navigateTo(`/apps/new?${q.toString()}`)
}

async function onResign(row: any) {
  if (!row?.id) return
  try {
    resigningId.value = row.id as string
    await $fetch(`/api/apps/${row.id}/resign`, { method: 'POST' })
    useToast().add({ title: 'Re-sign started', description: 'This may take a moment.', color: 'green' })
    await refresh()
  } catch (e: any) {
    useToast().add({ title: 'Re-sign failed', description: e?.data?.message || e?.message || 'Unknown error', color: 'red' })
  } finally {
    resigningId.value = null
  }
}

async function onDelete(row: any) {
  if (!row?.id) return
  const confirmed = typeof window !== 'undefined' ? window.confirm(`Are you sure you want to delete "${row.name}"? This cannot be undone.`) : true
  if (!confirmed) return

  try {
    deletingId.value = row.id as string
    await $fetch(`/api/apps/${row.id}`, { method: 'DELETE' })
    await refresh()
    useToast().add({ title: 'Deleted', description: 'The app was removed.' })
  } catch (e: any) {
    useToast().add({ title: 'Delete failed', description: e?.data?.message || e?.message || 'Unknown error', color: 'red' })
  } finally {
    deletingId.value = null
  }
}
</script>


