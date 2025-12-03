<template>
  <UCard class="glass max-w-sm mx-auto">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-arrow-right-end-on-rectangle" />
        <span class="font-semibold">Sign in</span>
      </div>
    </template>
    <UForm :state="state" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="Nickname" name="nickname">
        <UInput v-model="state.nickname" type="text" placeholder="Your nickname" />
      </UFormGroup>
      <UFormGroup label="Password" name="password">
        <UInput v-model="state.password" type="password" placeholder="••••••••" />
      </UFormGroup>
      <div class="flex justify-end">
        <UButton type="submit" color="white" variant="soft" :loading="loading" icon="i-heroicons-arrow-right-end-on-rectangle" label="Sign in" />
      </div>
    </UForm>
  </UCard>
</template>

<script setup lang="ts">
const { login } = useAuth()
const state = reactive({ nickname: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await login(state.nickname, state.password)
    navigateTo('/')
  } catch (e: any) {
    useToast().add({ title: 'Sign in failed', description: e?.data?.message || e?.message, color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>


