<template>
  <div class="space-y-6">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" />
            <span class="font-semibold">Signing Profile</span>
          </div>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid md:grid-cols-2 gap-4">
          <UFormGroup label="Display Name">
            <UInput v-model="displayName" placeholder="Shown on dashboard" />
          </UFormGroup>
          <UFormGroup label="Company Name">
            <UInput v-model="companyName" placeholder="Optional" />
          </UFormGroup>
        </div>

        <div class="grid md:grid-cols-3 gap-4">
          <UFormGroup label="Platform">
            <USelect v-model="platform" :options="platformOptions" />
          </UFormGroup>
          <UFormGroup label="Credential Type">
            <USelect v-model="credType" :options="credOptions" />
          </UFormGroup>
          <UFormGroup v-if="credType === 'p12'" label="P12 Password">
            <UInput v-model="p12Password" type="password" autocomplete="new-password" />
          </UFormGroup>
        </div>

        <div class="grid md:grid-cols-2 gap-4" v-if="credType === 'pem'">
          <UFormGroup label="Certificate (cert.pem)">
            <input ref="certRef" type="file" accept=".pem,.crt,.cer,.txt" class="block w-full text-sm" />
          </UFormGroup>
          <UFormGroup label="Private Key (key.pem)">
            <input ref="keyRef" type="file" accept=".pem,.key,.txt" class="block w-full text-sm" />
          </UFormGroup>
        </div>

        <div class="grid md:grid-cols-2 gap-4" v-else>
          <UFormGroup label="P12 File">
            <input ref="p12Ref" type="file" accept=".p12,.pfx" class="block w-full text-sm" />
          </UFormGroup>
          <div />
        </div>

        <UFormGroup label="Provisioning Profile (.mobileprovision)">
          <input ref="profileRef" type="file" accept=".mobileprovision" class="block w-full text-sm" />
        </UFormGroup>

        <div class="flex items-center gap-3">
          <UButton type="submit" color="red" :loading="submitting">Save & Re-sign Apps</UButton>
          <p v-if="message" class="text-sm text-white/70">{{ message }}</p>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Profile', layout: 'default' })

const displayName = ref('')
const companyName = ref('')
const platform = ref<'IOS' | 'TVOS'>('IOS')
const credType = ref<'pem' | 'p12'>('p12')
const p12Password = ref('')
const submitting = ref(false)
const message = ref('')

const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]
const credOptions = [
  { label: 'P12 + Password', value: 'p12' },
  { label: 'Certificate + Key (PEM)', value: 'pem' }
]

const certRef = ref<HTMLInputElement | null>(null)
const keyRef = ref<HTMLInputElement | null>(null)
const p12Ref = ref<HTMLInputElement | null>(null)
const profileRef = ref<HTMLInputElement | null>(null)

async function onSubmit() {
  submitting.value = true
  message.value = ''
  try {
    const fd = new FormData()
    if (displayName.value) fd.set('displayName', displayName.value)
    if (companyName.value) fd.set('companyName', companyName.value)
    fd.set('platform', platform.value)
    if (credType.value === 'p12') {
      const p12 = p12Ref.value?.files?.[0]
      if (p12) fd.set('p12', p12)
      if (p12Password.value) fd.set('p12Password', p12Password.value)
    } else {
      const cert = certRef.value?.files?.[0]
      const key = keyRef.value?.files?.[0]
      if (cert) fd.set('cert', cert)
      if (key) fd.set('key', key)
    }
    const profile = profileRef.value?.files?.[0]
    if (profile) fd.set('profile', profile)

    await $fetch('/api/profile/update', { method: 'POST', body: fd })
    message.value = 'Saved. Re-signing started in the background.'
  } catch (e: any) {
    message.value = e?.data?.message || 'Failed to save profile'
  } finally {
    submitting.value = false
  }
}
</script>


