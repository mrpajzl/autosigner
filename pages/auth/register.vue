<template>
  <UCard class="glass max-w-sm mx-auto">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-user-plus" />
        <span class="font-semibold">Register</span>
      </div>
    </template>
    <UForm :state="state" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="Email" name="email">
        <UInput v-model="state.email" type="email" placeholder="you@example.com" />
      </UFormGroup>
      <UFormGroup label="Password" name="password">
        <UInput v-model="state.password" type="password" placeholder="••••••••" />
      </UFormGroup>
      <div class="flex justify-end">
        <UButton type="submit" color="white" variant="soft" :loading="loading" icon="i-heroicons-user-plus" label="Create account" />
      </div>
      <p class="text-xs text-white/70">After registering, an admin must promote you to moderator to upload apps.</p>
    </UForm>
  </UCard>
</template>

<script setup lang="ts">
const state = reactive({ email: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: { email: state.email, password: state.password } })
    useToast().add({ title: 'Registered', description: 'You can sign in after approval.', color: 'green' })
    navigateTo('/auth/login')
  } catch (e: any) {
    useToast().add({ title: 'Registration failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
