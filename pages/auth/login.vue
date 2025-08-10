<template>
  <div class="max-w-md mx-auto">
    <UCard class="glass">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-lock-closed" />
          <span class="font-semibold">Sign in</span>
        </div>
      </template>
      <UForm :state="state" class="space-y-4" @submit="onSubmit">
        <UFormGroup label="Email" name="email">
          <UInput v-model="state.email" type="email" />
        </UFormGroup>
        <UFormGroup label="Password" name="password">
          <UInput v-model="state.password" type="password" />
        </UFormGroup>
        <div class="flex justify-end">
          <UButton type="submit" color="white" variant="soft" label="Sign in" />
        </div>
      </UForm>
    </UCard>
  </div>
  
</template>

<script setup lang="ts">
definePageMeta({ title: 'Sign in' })
const state = reactive({ email: '', password: '' })
async function onSubmit() {
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: state })
    navigateTo('/')
  } catch (e: any) {
    useToast().add({ title: 'Login failed', description: e?.data?.message || e.message, color: 'red' })
  }
}
</script>


