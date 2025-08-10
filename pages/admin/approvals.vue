<template>
  <UCard class="glass">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-check-badge" />
        <span class="font-semibold">Manager Approvals</span>
      </div>
    </template>
    <UTable :rows="rows" :columns="columns">
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton color="green" variant="soft" size="xs" @click="act(row.id, 'APPROVE')">Approve</UButton>
          <UButton color="red" variant="soft" size="xs" @click="act(row.id, 'REJECT')">Reject</UButton>
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Approvals', layout: 'default' })
const columns = [
  { key: 'email', label: 'Email' },
  { key: 'createdAt', label: 'Requested' },
  { key: 'actions', label: 'Actions' }
]
const { data: rows, refresh } = await useFetch('/api/admin/approvals')

async function act(id: string, action: 'APPROVE' | 'REJECT') {
  await $fetch(`/api/admin/approvals/${id}`, { method: 'POST', body: { action } })
  useToast().add({ title: `Request ${action.toLowerCase()}d`, color: 'green' })
  refresh()
}
</script>


