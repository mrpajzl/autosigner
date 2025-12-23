<template>
  <UCard class="glass max-w-sm mx-auto">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-arrow-right-end-on-rectangle" />
        <span class="font-semibold">Sign in</span>
      </div>
    </template>
    
    <!-- Discord OAuth Button -->
    <div class="mb-6">
      <UButton
        block
        color="indigo"
        size="lg"
        icon="i-simple-icons-discord"
        @click="signInWithDiscord"
      >
        Sign in with Discord
      </UButton>
      
      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">Or continue with credentials</span>
        </div>
      </div>
    </div>

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

function signInWithDiscord() {
  // Redirect to Discord OAuth endpoint
  window.location.href = '/api/auth/discord'
}
</script>


