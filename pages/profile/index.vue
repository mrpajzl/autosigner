<template>
  <div class="space-y-6">
    <!-- Account Settings -->
    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cog-6-tooth" />
            <span class="font-semibold">Account Settings</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-slate-900 dark:text-white">Password</p>
            <p class="text-sm text-slate-600 dark:text-white/60">Change your account password</p>
          </div>
          <UButton
            color="gray"
            variant="soft"
            icon="i-heroicons-key"
            label="Change Password"
            @click="showChangePassword = true"
          />
        </div>
      </div>
    </UCard>

    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" />
            <span class="font-semibold">Signing Assets</span>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <UButton to="/profile/certificates" color="red" variant="solid" icon="i-heroicons-identification" label="Certificates" />
          <UButton to="/profile/profiles" color="red" variant="solid" icon="i-heroicons-document-text" label="Provisioning Profiles" />
        </div>
        <p class="text-sm text-slate-600 dark:text-white/60">Manage signing assets separately. Active assets will be used for automatic background signing of your apps.</p>
      </div>
    </UCard>

    <UCard class="glass">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-building-storefront" />
            <span class="font-semibold">Apple Developer Integration</span>
          </div>
          <UBadge v-if="appleConnected" color="green" variant="soft">Connected</UBadge>
          <UBadge v-else color="gray" variant="soft">Not Connected</UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-white/60">
          Connect your Apple Developer account to manage devices (UDIDs) and provisioning profiles directly from this app.
          This is optional - you can still upload profiles manually.
        </p>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <UButton
            to="/profile/apple-developer"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-key"
            label="API Credentials"
          />
          <UButton
            to="/profile/devices"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-device-phone-mobile"
            label="Devices"
            :disabled="!appleConnected"
          />
          <UButton
            to="/profile/apple-profiles"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-cloud-arrow-down"
            label="Apple Profiles"
            :disabled="!appleConnected"
          />
          <UButton
            to="/profile/user-database"
            variant="ghost"
            class="surface-button"
            icon="i-heroicons-users"
            label="User Database"
          />
        </div>
      </div>
    </UCard>

    <!-- Change Password Modal -->
    <UModal v-model="showChangePassword">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-key" />
            <span class="font-semibold">Change Password</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <UFormGroup label="Current Password" required>
            <UInput
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="Enter your current password"
              autocomplete="current-password"
            />
          </UFormGroup>
          <UFormGroup label="New Password" required>
            <UInput
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="Enter your new password (min. 8 characters)"
              autocomplete="new-password"
            />
          </UFormGroup>
          <UFormGroup label="Confirm New Password" required>
            <UInput
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              autocomplete="new-password"
            />
          </UFormGroup>
          <UAlert
            v-if="passwordError"
            icon="i-heroicons-exclamation-circle"
            color="red"
            variant="soft"
            :title="passwordError"
          />
          <UAlert
            v-if="passwordSuccess"
            icon="i-heroicons-check-circle"
            color="green"
            variant="soft"
            title="Password changed successfully!"
          />
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="closePasswordModal">Cancel</UButton>
            <UButton
              color="primary"
              :loading="changingPassword"
              :disabled="passwordSuccess"
              @click="handleChangePassword"
            >
              Change Password
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'Profile', layout: 'default' })

const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

// Password change state
const showChangePassword = ref(false)
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

function closePasswordModal() {
  showChangePassword.value = false
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordError.value = ''
  passwordSuccess.value = false
}

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = false

  // Validate form
  if (!passwordForm.currentPassword) {
    passwordError.value = 'Current password is required'
    return
  }
  if (!passwordForm.newPassword) {
    passwordError.value = 'New password is required'
    return
  }
  if (passwordForm.newPassword.length < 8) {
    passwordError.value = 'New password must be at least 8 characters'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'New passwords do not match'
    return
  }

  changingPassword.value = true

  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }
    })
    passwordSuccess.value = true
    // Clear form after success
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    // Auto close after 2 seconds
    setTimeout(() => {
      closePasswordModal()
    }, 2000)
  } catch (e: any) {
    passwordError.value = e?.data?.message || 'Failed to change password'
  } finally {
    changingPassword.value = false
  }
}

// Reset form when modal closes
watch(showChangePassword, (val) => {
  if (!val) {
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordError.value = ''
    passwordSuccess.value = false
  }
})
</script>


