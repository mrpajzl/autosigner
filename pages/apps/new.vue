<template>
  <UCard class="glass max-w-3xl mx-auto">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-arrow-up-tray" />
        <span class="font-semibold">Upload New App (IPA only)</span>
      </div>
    </template>
    <UForm :state="state" :schema="schema" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="App Name" name="name">
        <UInput v-model="state.name" placeholder="My App" />
      </UFormGroup>
      <div class="grid md:grid-cols-2 gap-4">
        <UFormGroup label="Bundle ID" name="bundleId">
          <UInput v-model="state.bundleId" placeholder="com.example.app" />
        </UFormGroup>
        <UFormGroup label="Version" name="version">
          <UInput v-model="state.version" placeholder="1.0.0" />
        </UFormGroup>
      </div>
      <UFormGroup label="Platform" name="platform">
        <USelect v-model="state.platform" :options="platforms" />
      </UFormGroup>
      <UFormGroup label="IPA File" name="ipa">
        <input type="file" accept=".ipa" class="file:mr-4 file:rounded-md file:border-0 file:bg-primary-500 file:text-white file:px-3 file:py-2" @change="onFile" />
      </UFormGroup>
      <div class="flex justify-between items-center text-sm text-white/70">
        <span>Signing uses your active certificate and provisioning profile from Profile pages.</span>
        <UButton to="/profile" color="white" variant="soft" size="xs" icon="i-heroicons-user" label="Manage Profile" />
      </div>
      <div class="flex justify-end">
        <UButton type="submit" color="white" variant="soft" icon="i-heroicons-rocket-launch" :loading="loading" label="Upload & Sign" />
      </div>
    </UForm>
  </UCard>
  
</template>

<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ title: 'Upload App', layout: 'default' })

const schema = z.object({
  name: z.string().min(1),
  bundleId: z.string().optional(),
  version: z.string().optional(),
  platform: z.enum(['IOS', 'TVOS'])
})

const platforms = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]

const state = reactive({ name: '', bundleId: '', version: '', platform: 'IOS' as 'IOS' | 'TVOS' })
const files = reactive<{ ipa?: File }>({})
const loading = ref(false)

function onFile(e: Event) { files.ipa = (e.target as HTMLInputElement).files?.[0] }

async function onSubmit() {
  const body = new FormData()
  body.set('name', state.name)
  if (state.bundleId) body.set('bundleId', state.bundleId)
  if (state.version) body.set('version', state.version)
  body.set('platform', state.platform)
  if (files.ipa) body.set('ipa', files.ipa)
  loading.value = true
  try {
    await $fetch('/api/apps/upload', { method: 'POST', body })
    useToast().add({ title: 'Upload started', color: 'green' })
    navigateTo('/apps')
  } catch (e: any) {
    useToast().add({ title: 'Upload failed', description: e?.data?.message || e.message, color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>


