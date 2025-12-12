<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-key" />
            <span class="card-title">Apple Developer API Credentials</span>
          </div>
          <UBadge v-if="isConnected" color="green" variant="soft">Connected</UBadge>
        </div>
      </template>

      <div class="space-y-6">
        <!-- Info Section -->
        <UAlert
          icon="i-heroicons-information-circle"
          color="blue"
          variant="soft"
          title="How to get your API credentials"
        >
          <template #description>
            <ol class="list-decimal list-inside space-y-1 text-sm mt-2">
              <li>Go to <a href="https://appstoreconnect.apple.com/access/integrations/api" target="_blank" class="underline">App Store Connect → Users and Access → Integrations → Team Keys</a></li>
              <li>Click the "+" button to generate a new Team API key</li>
              <li>Select the access level as <span class="font-semibold">Admin</span> (required for device/profile management)</li>
              <li>Click the "Create" button to create the key</li>
              <li>Download the .p8 private key file (you can only download it once!)</li>
              <li>Copy the Key ID and Issuer ID from the page</li>
              <li>Paste everything here and connect your account</li>
            </ol>
          </template>
        </UAlert>

        <!-- Already connected view -->
        <div v-if="isConnected && credentials" class="space-y-4">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-slate-500 dark:text-white/60 uppercase tracking-wide mb-1">Key ID</p>
              <p class="font-mono text-sm">{{ credentials.keyId }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500 dark:text-white/60 uppercase tracking-wide mb-1">Issuer ID</p>
              <p class="font-mono text-sm truncate">{{ credentials.issuerId }}</p>
            </div>
            <div v-if="credentials.teamName">
              <p class="text-xs text-slate-500 dark:text-white/60 uppercase tracking-wide mb-1">Team Name</p>
              <p class="text-sm">{{ credentials.teamName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500 dark:text-white/60 uppercase tracking-wide mb-1">Connected</p>
              <p class="text-sm">{{ new Date(credentials.createdAt).toLocaleDateString() }}</p>
            </div>
          </div>

          <UDivider />

          <div class="flex gap-3">
            <UButton variant="ghost" class="surface-button" icon="i-heroicons-arrow-path" @click="showUpdateForm = !showUpdateForm">
              {{ showUpdateForm ? 'Cancel Update' : 'Update Credentials' }}
            </UButton>
            <UButton variant="ghost" class="danger-surface-button" icon="i-heroicons-trash" @click="handleDisconnect">
              Disconnect
            </UButton>
          </div>
        </div>

        <!-- Form (shown when not connected or updating) -->
        <form v-if="!isConnected || showUpdateForm" class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField label="Key ID" required>
            <UInput v-model="form.keyId" placeholder="XXXXXXXXXX" />
          </UFormField>

          <UFormField label="Issuer ID" required>
            <UInput v-model="form.issuerId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </UFormField>

          <UFormField label="Private Key (.p8 file)" required>
            <div class="space-y-2">
              <input
                ref="fileInput"
                type="file"
                accept=".p8"
                class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 dark:file:bg-white/10 dark:file:text-white hover:file:bg-slate-200 dark:hover:file:bg-white/20"
                @change="handleFileChange"
              />
              <p class="text-xs text-slate-500 dark:text-white/60">Or paste the key content directly:</p>
              <UTextarea
                v-model="form.privateKey"
                rows="6"
                placeholder="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
                class="font-mono text-xs"
              />
            </div>
          </UFormField>

          <UFormField label="Team Name (optional)">
            <UInput v-model="form.teamName" placeholder="My Company Inc." />
          </UFormField>

          <div class="flex items-center gap-3 pt-2">
            <UButton type="submit" color="green" :loading="loading" icon="i-heroicons-check">
              {{ isConnected ? 'Update Connection' : 'Connect Account' }}
            </UButton>
            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <p v-if="success" class="text-sm text-green-400">{{ success }}</p>
          </div>
        </form>
      </div>
    </UCard>

    <!-- Quick Links -->
    <UCard v-if="isConnected" class="glass">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-link" />
          <span class="font-semibold">Quick Actions</span>
        </div>
      </template>

      <div class="grid md:grid-cols-2 gap-4">
        <UButton
          to="/profile/devices"
          variant="ghost"
          class="surface-button"
          icon="i-heroicons-device-phone-mobile"
          label="Manage Devices"
          block
        />
        <UButton
          to="/profile/apple-profiles"
          variant="ghost"
          class="surface-button"
          icon="i-heroicons-document-text"
          label="View Apple Profiles"
          block
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFetch } from 'nuxt/app'

type AppleCredentialStatus = {
  connected: boolean
  credentials: {
    keyId: string
    issuerId: string
    teamName?: string | null
    createdAt: string
  } | null
}

declare function definePageMeta(meta: { title?: string; layout?: string }): void

definePageMeta({ title: 'Apple Developer', layout: 'default' })

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const error = ref('')
const success = ref('')
const showUpdateForm = ref(false)

const form = reactive({
  keyId: '',
  issuerId: '',
  privateKey: '',
  teamName: ''
})

const { data: status, refresh } = await useFetch<AppleCredentialStatus>('/api/apple/credentials')
const isConnected = computed(() => status.value?.connected ?? false)
const credentials = computed(() => status.value?.credentials)

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      form.privateKey = event.target?.result as string
    }
    reader.readAsText(file)
  }
}

async function handleSubmit() {
  error.value = ''
  success.value = ''

  if (!form.keyId || !form.issuerId || !form.privateKey) {
    error.value = 'Please fill in all required fields'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/apple/credentials', {
      method: 'POST',
      body: {
        keyId: form.keyId.trim(),
        issuerId: form.issuerId.trim(),
        privateKey: form.privateKey.trim(),
        teamName: form.teamName.trim() || undefined
      }
    })
    success.value = 'Successfully connected to Apple Developer!'
    showUpdateForm.value = false
    // Reset form
    form.keyId = ''
    form.issuerId = ''
    form.privateKey = ''
    form.teamName = ''
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to connect'
  } finally {
    loading.value = false
  }
}

async function handleDisconnect() {
  if (!confirm('Are you sure you want to disconnect your Apple Developer account?')) return

  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/apple/credentials', { method: 'DELETE' })
    success.value = 'Disconnected successfully'
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to disconnect'
  } finally {
    loading.value = false
  }
}
</script>

