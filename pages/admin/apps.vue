<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Upload New App - Collapsible -->
    <UCard class="glass overflow-hidden" :ui="{ body: { padding: '' } }">
      <template #header>
        <button
          type="button"
          class="flex items-center justify-between w-full text-left"
          @click="uploadSectionOpen = !uploadSectionOpen"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-up-tray" />
            <span class="font-semibold">Upload New App</span>
          </div>
          <UIcon
            name="i-heroicons-chevron-down"
            class="w-5 h-5 transition-transform duration-200"
            :class="{ 'rotate-180': uploadSectionOpen }"
          />
        </button>
      </template>

      <div
        class="grid transition-all duration-200 ease-out overflow-hidden"
        :class="uploadSectionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="overflow-hidden">
          <form class="space-y-4 p-4 sm:p-6" @submit.prevent="uploadIpa()">
            <div class="grid md:grid-cols-4 gap-4">
              <UFormGroup label="App Name" required>
                <UInput v-model="uploadForm.name" placeholder="My App" />
              </UFormGroup>
              <UFormGroup label="Platform" required>
                <USelect v-model="uploadForm.platform" :options="platformOptions" />
              </UFormGroup>
              <UFormGroup label="IPA File" required>
                <input
                  ref="ipaInput"
                  type="file"
                  accept=".ipa"
                  class="file:mr-4 file:rounded-md file:border-0 file:bg-red-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
                />
              </UFormGroup>
              <UFormGroup label="App Icon (optional)">
                <input
                  ref="iconInput"
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  class="file:mr-4 file:rounded-md file:border-0 file:bg-slate-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
                />
                <template #hint>
                  <span class="text-xs">PNG or JPG for the app icon</span>
                </template>
              </UFormGroup>
            </div>
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="text-sm text-slate-600 dark:text-white/60">
                  Bundle ID and version will be extracted automatically.
                </span>
                <UCheckbox v-model="uploadForm.signByAll" label="Sign by all moderators" />
              </div>
              <UButton
                type="submit"
                color="red"
                variant="solid"
                icon="i-heroicons-arrow-up-tray"
                :loading="uploading"
                :disabled="uploading"
              >
                Upload App
              </UButton>
            </div>
          </form>
        </div>
      </div>
      
    </UCard>

    <!-- Upload Progress Bar - Separate card for visibility -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <UCard v-if="uploading" class="glass border-2 border-red-500/30">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-up-tray" class="w-4 h-4 text-red-500 animate-bounce" />
              </div>
              <div>
                <p class="font-medium text-slate-800 dark:text-white">{{ uploadStatus || 'Uploading IPA...' }}</p>
                <p class="text-xs text-slate-500 dark:text-white/50">{{ uploadForm.name || 'New App' }}</p>
              </div>
            </div>
            <span class="text-2xl font-mono font-bold text-red-600 dark:text-red-400">{{ uploadProgress }}%</span>
          </div>
          <div class="h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-red-500 via-red-600 to-red-500 rounded-full transition-all duration-300 ease-out"
              :class="{ 'animate-pulse': uploadProgress === 100 }"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
          <p v-if="uploadProgress === 100" class="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            {{ uploadStatus || 'Processing...' }}
          </p>
        </div>
      </UCard>
    </Transition>

    <!-- All Apps List -->
    <UCard class="glass" :ui="{ body: { padding: 'p-4 sm:p-6' }, base: 'overflow-visible' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="font-semibold">All Uploaded Apps</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              size="sm"
              :loading="refreshing"
              @click="manualRefresh"
            />
            <UBadge color="gray" variant="soft">
              {{ apps?.length || 0 }} apps
            </UBadge>
          </div>
        </div>
      </template>

      <div v-if="!apps || apps.length === 0" class="text-center py-8 text-slate-500 dark:text-white/60">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No apps have been uploaded yet.</p>
        <p class="text-sm mt-1">Upload your first IPA using the form above.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="app in apps"
          :key="app.id"
          class="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-white/5 space-y-3"
        >
          <!-- App Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4 flex-1">
              <!-- App Icon with upload overlay -->
              <div class="relative group flex-shrink-0">
                <img
                  v-if="app.iconPath"
                  :src="`/api/download${app.iconPath}`"
                  :alt="app.name"
                  class="w-14 h-14 rounded-2xl shadow-md object-cover"
                />
                <div v-else class="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center shadow-md">
                  <UIcon :name="app.platform === 'IOS' ? 'i-heroicons-device-phone-mobile' : 'i-heroicons-tv'" class="w-7 h-7 text-slate-400 dark:text-white/40" />
                </div>
                <!-- Upload overlay -->
                <label
                  class="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  :title="app.iconPath ? 'Change icon' : 'Add icon'"
                >
                  <UIcon name="i-heroicons-camera" class="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    class="hidden"
                    @change="uploadIconForApp(app.id, $event)"
                  />
                </label>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <UBadge :color="app.platform === 'IOS' ? 'blue' : 'purple'" variant="soft">
                    {{ app.platform }}
                  </UBadge>
                  <!-- Editable app name -->
                  <div v-if="editingAppId === app.id" class="flex items-center gap-2">
                    <UInput
                      v-model="editingAppName"
                      size="sm"
                      class="font-semibold"
                      autofocus
                      @keyup.enter="saveAppName(app.id)"
                      @keyup.escape="cancelEditName"
                    />
                    <UButton
                      color="green"
                      variant="ghost"
                      icon="i-heroicons-check"
                      size="xs"
                      :loading="savingAppName"
                      @click="saveAppName(app.id)"
                    />
                    <UButton
                      color="gray"
                      variant="ghost"
                      icon="i-heroicons-x-mark"
                      size="xs"
                      :disabled="savingAppName"
                      @click="cancelEditName"
                    />
                  </div>
                  <h3
                    v-else
                    class="font-semibold text-lg cursor-pointer hover:text-red-500 transition-colors group/name"
                    title="Click to edit name"
                    @click="startEditName(app)"
                  >
                    {{ app.name }}
                    <UIcon name="i-heroicons-pencil" class="w-4 h-4 inline-block ml-1 opacity-0 group-hover/name:opacity-50 transition-opacity" />
                  </h3>
                </div>
                <div class="text-sm text-slate-600 dark:text-white/60 mt-1 space-x-4">
                  <span>{{ app.bundleId || 'Unknown bundle' }}</span>
                  <span>v{{ displayVersion(app) }}</span>
                </div>
                <UTooltip :text="`Uploaded: ${formatDate(app.uploadedAt)}`">
                  <div class="text-xs text-slate-500 dark:text-white/40 mt-1 cursor-help">
                    Uploaded by <span class="text-slate-600 dark:text-white/60 font-medium">{{ app.owner.nickname }}</span>
                  </div>
                </UTooltip>
              </div>
            </div>
            <!-- Action buttons -->
            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-2">
                <!-- Release new version button -->
                <UButton
                  color="gray"
                  variant="outline"
                  icon="i-heroicons-arrow-up-on-square"
                  size="sm"
                  @click="openNewVersionModal(app)"
                >
                  Release New Version
                </UButton>
                <!-- Three-dots menu -->
                <div class="relative">
                  <UButton
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-vertical"
                    size="sm"
                    @click.stop="openMenuId = openMenuId === app.id ? null : app.id"
                  />
                  <!-- Backdrop to catch clicks outside -->
                  <div
                    v-if="openMenuId === app.id"
                    class="fixed inset-0 z-40"
                    @click="openMenuId = null"
                  />
                  <!-- Dropdown menu -->
                  <Transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                  >
                    <div
                      v-if="openMenuId === app.id"
                      class="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1"
                    >
                      <button
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-left"
                        @click="toggleBuildNumber(app.id); openMenuId = null"
                      >
                        <UIcon :name="app.showBuildNumber ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
                        {{ app.showBuildNumber ? 'Hide build number' : 'Show build number' }}
                      </button>
                      <button
                        v-if="canDelete(app)"
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-left text-red-500"
                        @click="confirmDeleteApp(app); openMenuId = null"
                      >
                        <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </Transition>
                </div>
              </div>
              <!-- Sign by all button -->
              <UButton
                color="amber"
                variant="solid"
                icon="i-heroicons-users"
                size="sm"
                :loading="signingAllAppId === app.id"
                @click="signByAllModerators(app.id)"
              >
                Sign by All
              </UButton>
              <!-- Sign button - different states based on user's signing status -->
              <UButton
                v-if="!mySignedVersion(app) || mySignedVersion(app)?.status === 'FAILED'"
                color="red"
                variant="solid"
                icon="i-heroicons-pencil-square"
                size="sm"
                :loading="signingAppId === app.id"
                @click="signApp(app.id)"
              >
                {{ mySignedVersion(app)?.status === 'FAILED' ? 'Retry signing' : 'Sign with my credentials' }}
              </UButton>
              <UButton
                v-else-if="mySignedVersion(app)?.status === 'SIGNING'"
                color="amber"
                variant="outline"
                icon="i-heroicons-arrow-path"
                size="sm"
                disabled
              >
                Signing in progress...
              </UButton>
              <UButton
                v-else-if="mySignedVersion(app)?.status === 'SIGNED'"
                color="emerald"
                variant="solid"
                icon="i-heroicons-check-circle"
                size="sm"
                @click="signApp(app.id)"
              >
                Re-sign with my credentials
              </UButton>
            </div>
          </div>

          <!-- Signed Versions -->
          <div v-if="app.signedVersions.length > 0" class="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div class="text-xs text-slate-500 dark:text-white/50 mb-2 uppercase tracking-wider">Signed Versions</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="sv in app.signedVersions"
                :key="sv.id"
                class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                :class="statusClass(sv.status)"
              >
                <UIcon
                  :name="statusIcon(sv.status)"
                  class="w-4 h-4"
                />
                <span class="font-medium">{{ sv.signerName }}</span>
                <span v-if="sv.status === 'SIGNED'" class="text-slate-600 dark:text-white/60">
                  {{ formatDate(sv.signedAt) }}
                </span>
                <span v-else class="text-slate-600 dark:text-white/60">{{ sv.status }}</span>
                
                <!-- Install/Download buttons for signed versions -->
                <template v-if="sv.status === 'SIGNED'">
                  <UButton
                    v-if="app.platform === 'IOS'"
                    size="xs"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    :to="installLink(sv)"
                    target="_blank"
                  />
                  <UButton
                    v-else
                    size="xs"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    :to="downloadLink(sv)"
                    target="_blank"
                  />
                </template>
                <!-- Retry button for failed signings -->
                <UButton
                  v-if="sv.status === 'FAILED'"
                  size="xs"
                  color="red"
                  variant="ghost"
                  icon="i-heroicons-arrow-path"
                  :loading="retryingVersionId === sv.id"
                  title="Retry signing"
                  @click.stop="retrySignedVersion(app.id, sv)"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-slate-500 dark:text-white/40 mt-2">
            No signed versions yet
          </div>
        </div>
      </div>
    </UCard>

    <!-- New Version Modal -->
    <UModal v-model="showNewVersionModal">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-up-on-square" class="text-red-500" />
            <span class="font-semibold">Release New Version</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="uploadNewVersion">
          <div v-if="selectedApp" class="p-3 rounded-lg bg-slate-100 dark:bg-white/5">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ selectedApp.name }}</span>
              <UBadge :color="selectedApp.platform === 'IOS' ? 'blue' : 'purple'" variant="soft" size="xs">
                {{ selectedApp.platform }}
              </UBadge>
            </div>
            <div class="text-sm text-slate-600 dark:text-white/60 mt-1">
              Current: v{{ selectedApp.version }} • {{ selectedApp.bundleId }}
            </div>
          </div>

          <UFormGroup label="New IPA File" required>
            <input
              ref="newVersionIpaInput"
              type="file"
              accept=".ipa"
              class="file:mr-4 file:rounded-md file:border-0 file:bg-red-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
            />
          </UFormGroup>

          <UFormGroup label="App Icon (optional)">
            <input
              ref="newVersionIconInput"
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              class="file:mr-4 file:rounded-md file:border-0 file:bg-slate-500 file:text-white file:px-3 file:py-2 block w-full text-sm"
            />
            <template #hint>
              <span class="text-xs">PNG or JPG to update the app icon</span>
            </template>
          </UFormGroup>

          <UFormGroup>
            <UCheckbox v-model="newVersionForm.signByAll" label="Sign by all moderators automatically" />
            <template #hint>
              <span class="text-xs text-slate-500 dark:text-white/40">
                When enabled, the new version will be signed by all moderators who have valid certificates and profiles.
              </span>
            </template>
          </UFormGroup>

          <!-- Upload Progress Bar for New Version -->
          <div
            v-if="uploadingNewVersion"
            class="space-y-2"
          >
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-600 dark:text-white/60">
                <UIcon name="i-heroicons-arrow-up-tray" class="inline w-4 h-4 mr-1 animate-pulse" />
                {{ newVersionUploadStatus || 'Uploading new version...' }}
              </span>
              <span class="font-mono font-medium text-red-600 dark:text-red-400">{{ newVersionUploadProgress }}%</span>
            </div>
            <div class="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 ease-out"
                :class="{ 'animate-pulse': newVersionUploadProgress === 100 }"
                :style="{ width: `${newVersionUploadProgress}%` }"
              />
            </div>
            <p v-if="newVersionUploadProgress === 100" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
              {{ newVersionUploadStatus || 'Processing...' }}
            </p>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="gray"
              variant="outline"
              :disabled="uploadingNewVersion"
              @click="showNewVersionModal = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="red"
              variant="solid"
              icon="i-heroicons-arrow-up-tray"
              :loading="uploadingNewVersion"
              :disabled="uploadingNewVersion"
            >
              Upload New Version
            </UButton>
          </div>
        </form>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 text-red-500">
            <UIcon name="i-heroicons-exclamation-triangle" />
            <span class="font-semibold">Delete App</span>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-slate-600 dark:text-white/70">
            Are you sure you want to delete this app? This action cannot be undone.
          </p>
          
          <div v-if="appToDelete" class="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <div class="flex items-center gap-2">
              <span class="font-medium text-red-700 dark:text-red-300">{{ appToDelete.name }}</span>
              <UBadge :color="appToDelete.platform === 'IOS' ? 'blue' : 'purple'" variant="soft" size="xs">
                {{ appToDelete.platform }}
              </UBadge>
            </div>
            <div class="text-sm text-red-600 dark:text-red-400 mt-1">
              v{{ appToDelete.version }} • {{ appToDelete.bundleId }}
            </div>
            <div v-if="appToDelete.signedVersions.length > 0" class="text-xs text-red-500 dark:text-red-400/80 mt-2">
              ⚠️ This will also delete {{ appToDelete.signedVersions.length }} signed version(s)
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="gray"
              variant="outline"
              @click="showDeleteModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="red"
              variant="solid"
              icon="i-heroicons-trash"
              :loading="deletingAppId !== null"
              @click="deleteApp"
            >
              Delete App
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'All Apps', layout: 'default' })

const toast = useToast()
const { public: publicConfig } = useRuntimeConfig()

type SignedVersion = {
  id: string
  signerId: string
  signerName: string
  status: string
  signedAt: string | null
  signedIpaPath: string | null
  manifestPath: string | null
}

type AppRow = {
  id: string
  name: string
  bundleId: string
  version: string
  buildNumber?: string | null
  showBuildNumber: boolean
  platform: 'IOS' | 'TVOS'
  uploadedAt: string
  iconPath?: string | null
  owner: { id: string; nickname: string }
  signedVersions: SignedVersion[]
}

const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'tvOS', value: 'TVOS' }
]

const { user: me } = useAuth()

const { data: apps, refresh } = await useFetch<AppRow[]>('/api/admin/apps')

// Upload section collapsed state
const uploadSectionOpen = ref(false)

// Upload form state
const uploadForm = reactive({
  name: '',
  platform: 'IOS' as 'IOS' | 'TVOS',
  signByAll: false
})
const ipaInput = ref<HTMLInputElement | null>(null)
const iconInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref('')

// Signing state
const signingAppId = ref<string | null>(null)
const signingAllAppId = ref<string | null>(null)
const retryingVersionId = ref<string | null>(null)
const refreshing = ref(false)
const openMenuId = ref<string | null>(null)

// New version modal state
const showNewVersionModal = ref(false)
const selectedApp = ref<AppRow | null>(null)
const newVersionForm = reactive({
  signByAll: true
})
const newVersionIpaInput = ref<HTMLInputElement | null>(null)
const newVersionIconInput = ref<HTMLInputElement | null>(null)
const uploadingNewVersion = ref(false)
const newVersionUploadProgress = ref(0)
const newVersionUploadStatus = ref('')

// Upload with progress tracking using XMLHttpRequest
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch {
          reject(new Error('Invalid JSON response'))
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText)
          reject({ data: error })
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })
    
    xhr.open('POST', url)
    xhr.send(formData)
  })
}

// Delete modal state
const showDeleteModal = ref(false)
const appToDelete = ref<AppRow | null>(null)
const deletingAppId = ref<string | null>(null)

// Edit app name state
const editingAppId = ref<string | null>(null)
const editingAppName = ref('')
const savingAppName = ref(false)

function startEditName(app: AppRow) {
  editingAppId.value = app.id
  editingAppName.value = app.name
}

function cancelEditName() {
  editingAppId.value = null
  editingAppName.value = ''
}

async function saveAppName(appId: string) {
  if (!editingAppName.value.trim()) {
    toast.add({ title: 'App name cannot be empty', color: 'red' })
    return
  }
  
  savingAppName.value = true
  try {
    await $fetch(`/api/admin/apps/${appId}/update`, {
      method: 'POST',
      body: { name: editingAppName.value.trim() }
    })
    
    toast.add({
      title: 'App name updated',
      color: 'green'
    })
    
    editingAppId.value = null
    editingAppName.value = ''
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Failed to update app name',
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red'
    })
  } finally {
    savingAppName.value = false
  }
}

// Toggle build number visibility for a specific app (persisted to database)
async function toggleBuildNumber(appId: string) {
  try {
    await $fetch(`/api/admin/apps/${appId}/toggle-build`, { method: 'POST' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Failed to toggle build number',
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red'
    })
  }
}

// Get menu items for an app
function getAppMenuItems(app: AppRow) {
  const items: any[][] = [[]]
  
  // Show build number toggle
  items[0].push({
    label: app.showBuildNumber ? 'Hide build number' : 'Show build number',
    icon: app.showBuildNumber ? 'i-heroicons-eye-slash' : 'i-heroicons-eye',
    click: () => toggleBuildNumber(app.id)
  })
  
  // Delete option (only for users who can delete)
  if (canDelete(app)) {
    items.push([{
      label: 'Delete',
      icon: 'i-heroicons-trash',
      class: 'text-red-500',
      click: () => confirmDeleteApp(app)
    }])
  }
  
  return items
}

// Display version with optional build number
function displayVersion(app: AppRow) {
  const hasVersion = typeof app.version === 'string' && app.version.length > 0
  const hasBuild = typeof app.buildNumber === 'string' && app.buildNumber.length > 0
  
  if (hasVersion && hasBuild && app.showBuildNumber && app.version !== app.buildNumber) {
    return `${app.version} (${app.buildNumber})`
  }
  if (hasVersion) return app.version
  if (hasBuild) return app.buildNumber
  return '?'
}

// Auto-refresh every 5 seconds to update signing status
// Use a flag to prevent concurrent refresh calls
let refreshInterval: ReturnType<typeof setInterval> | null = null
let isAutoRefreshing = false

onMounted(() => {
  refreshInterval = setInterval(async () => {
    // Only auto-refresh if there are apps in signing state
    const hasPending = apps.value?.some(app => 
      app.signedVersions.some(sv => sv.status === 'SIGNING' || sv.status === 'PENDING')
    )
    if (hasPending && !isAutoRefreshing && !refreshing.value) {
      isAutoRefreshing = true
      try {
        await refresh()
      } catch {
        // Silently ignore refresh errors during auto-refresh
      } finally {
        isAutoRefreshing = false
      }
    }
  }, 5000)
})
onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

// Non-blocking refresh helper - fires refresh without awaiting
function triggerRefresh() {
  if (!refreshing.value && !isAutoRefreshing) {
    refresh().catch(() => {
      // Silently ignore errors, next auto-refresh will retry
    })
  }
}

async function manualRefresh() {
  refreshing.value = true
  await refresh()
  refreshing.value = false
}

async function uploadIpa() {
  const file = ipaInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select an IPA file first', color: 'red' })
    return
  }
  if (!uploadForm.name.trim()) {
    toast.add({ title: 'App name is required', color: 'red' })
    return
  }

  uploading.value = true
  uploadProgress.value = 0
  uploadStatus.value = 'Uploading IPA file...'
  try {
    const body = new FormData()
    body.set('name', uploadForm.name.trim())
    body.set('platform', uploadForm.platform)
    body.set('ipa', file)
    
    // Add optional icon if provided
    const iconFile = iconInput.value?.files?.[0]
    if (iconFile) {
      body.set('icon', iconFile)
    }
    
    const result = await uploadWithProgress(
      '/api/apps/upload',
      body,
      (percent) => {
        uploadProgress.value = percent
        if (percent < 100) {
          uploadStatus.value = `Uploading IPA file... (${Math.round(file.size * percent / 100 / 1024 / 1024)}MB / ${Math.round(file.size / 1024 / 1024)}MB)`
        } else {
          uploadStatus.value = 'Processing IPA on server...'
        }
      }
    )
    
    toast.add({ 
      title: 'App uploaded successfully', 
      description: 'The app is now available for all moderators to sign.',
      color: 'green' 
    })
    
    // Sign by all if requested
    if (uploadForm.signByAll) {
      try {
        const signResult = await $fetch<{ queued: number; moderators: string[] }>(`/api/admin/apps/${result.id}/sign-all`, { method: 'POST' })
        toast.add({ 
          title: 'Signing queued for all moderators', 
          description: `${signResult.queued} moderators will sign this app`,
          color: 'green' 
        })
      } catch (e: any) {
        toast.add({ 
          title: 'Auto-sign failed', 
          description: e?.data?.message || 'Moderators can still sign manually',
          color: 'yellow' 
        })
      }
    }
    
    // Reset form
    uploadForm.name = ''
    uploadForm.platform = 'IOS'
    uploadForm.signByAll = false
    if (ipaInput.value) ipaInput.value.value = ''
    if (iconInput.value) iconInput.value.value = ''
    
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Upload failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    uploadStatus.value = ''
  }
}

// Check if current user has already signed this app
function mySignedVersion(app: AppRow): SignedVersion | undefined {
  return app.signedVersions.find(sv => sv.signerId === me.value?.id)
}

async function signApp(appId: string) {
  try {
    signingAppId.value = appId
    const result = await $fetch<{ ok: boolean; queuePosition?: number }>(`/api/admin/apps/${appId}/sign`, { method: 'POST' })
    const queueMsg = result.queuePosition && result.queuePosition > 1 
      ? ` (Position ${result.queuePosition} in queue)` 
      : ''
    toast.add({ 
      title: 'Signing queued', 
      description: `Your signed version will appear shortly.${queueMsg}`,
      color: 'green' 
    })
    // Non-blocking refresh - signing happens in background
    triggerRefresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Signing failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    signingAppId.value = null
  }
}

async function signByAllModerators(appId: string) {
  try {
    signingAllAppId.value = appId
    const result = await $fetch<{ queued: number; moderators: string[]; queueStatus?: { total: number; running: number; pending: number } }>(`/api/admin/apps/${appId}/sign-all`, { method: 'POST' })
    const queueInfo = result.queueStatus 
      ? ` (${result.queueStatus.running} running, ${result.queueStatus.pending} pending)`
      : ''
    toast.add({ 
      title: 'Signing queued for all moderators', 
      description: `${result.queued} moderators: ${result.moderators.join(', ')}${queueInfo}`,
      color: 'green' 
    })
    // Non-blocking refresh - signing happens in background
    triggerRefresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Sign by all failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    signingAllAppId.value = null
  }
}

async function retrySignedVersion(appId: string, sv: SignedVersion) {
  try {
    retryingVersionId.value = sv.id
    const result = await $fetch<{ ok: boolean; signerName: string; queuePosition?: number }>(`/api/admin/apps/${appId}/retry/${sv.id}`, { method: 'POST' })
    const queueMsg = result.queuePosition && result.queuePosition > 1 
      ? ` (Position ${result.queuePosition} in queue)` 
      : ''
    toast.add({ 
      title: 'Retry queued', 
      description: `Retrying signing for ${result.signerName}.${queueMsg}`,
      color: 'green' 
    })
    // Non-blocking refresh - signing happens in background
    triggerRefresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Retry failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    retryingVersionId.value = null
  }
}

function openNewVersionModal(app: AppRow) {
  selectedApp.value = app
  newVersionForm.signByAll = true
  showNewVersionModal.value = true
}

async function uploadNewVersion() {
  const file = newVersionIpaInput.value?.files?.[0]
  if (!file) {
    toast.add({ title: 'Select an IPA file first', color: 'red' })
    return
  }
  if (!selectedApp.value) {
    toast.add({ title: 'No app selected', color: 'red' })
    return
  }

  uploadingNewVersion.value = true
  newVersionUploadProgress.value = 0
  newVersionUploadStatus.value = 'Uploading IPA file...'
  try {
    const body = new FormData()
    body.set('appId', selectedApp.value.id)
    body.set('name', selectedApp.value.name)
    body.set('platform', selectedApp.value.platform)
    body.set('ipa', file)
    
    // Add optional icon if provided
    const iconFile = newVersionIconInput.value?.files?.[0]
    if (iconFile) {
      body.set('icon', iconFile)
    }
    
    const result = await uploadWithProgress(
      '/api/apps/upload',
      body,
      (percent) => {
        newVersionUploadProgress.value = percent
        if (percent < 100) {
          newVersionUploadStatus.value = `Uploading... (${Math.round(file.size * percent / 100 / 1024 / 1024)}MB / ${Math.round(file.size / 1024 / 1024)}MB)`
        } else {
          newVersionUploadStatus.value = 'Processing IPA on server...'
        }
      }
    )
    
    toast.add({ 
      title: 'New version uploaded successfully', 
      description: 'The app has been updated with the new IPA.',
      color: 'green' 
    })
    
    // Sign by all if requested
    if (newVersionForm.signByAll) {
      try {
        const signResult = await $fetch<{ queued: number; moderators: string[] }>(`/api/admin/apps/${result.id}/sign-all`, { method: 'POST' })
        toast.add({ 
          title: 'Signing queued for all moderators', 
          description: `${signResult.queued} moderators will sign this version`,
          color: 'green' 
        })
      } catch (e: any) {
        toast.add({ 
          title: 'Auto-sign failed', 
          description: e?.data?.message || 'Moderators can still sign manually',
          color: 'yellow' 
        })
      }
    }
    
    // Reset and close
    showNewVersionModal.value = false
    selectedApp.value = null
    if (newVersionIpaInput.value) newVersionIpaInput.value.value = ''
    if (newVersionIconInput.value) newVersionIconInput.value.value = ''
    
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Upload failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    uploadingNewVersion.value = false
    newVersionUploadProgress.value = 0
    newVersionUploadStatus.value = ''
  }
}

// Check if user can delete this app (owner or SUPERADMIN)
function canDelete(app: AppRow): boolean {
  if (!me.value) return false
  return app.owner.id === me.value.id || me.value.role === 'SUPERADMIN'
}

function confirmDeleteApp(app: AppRow) {
  appToDelete.value = app
  showDeleteModal.value = true
}

async function uploadIconForApp(appId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  try {
    const body = new FormData()
    body.set('icon', file)
    
    await $fetch(`/api/apps/${appId}/icon`, { method: 'POST', body })
    
    toast.add({ 
      title: 'Icon updated', 
      description: 'The app icon has been updated successfully.',
      color: 'green' 
    })
    
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Failed to update icon', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    // Reset the input so the same file can be selected again
    input.value = ''
  }
}

async function deleteApp() {
  if (!appToDelete.value) return
  
  deletingAppId.value = appToDelete.value.id
  try {
    await $fetch(`/api/admin/apps/${appToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ 
      title: 'App deleted', 
      description: `${appToDelete.value.name} has been deleted.`,
      color: 'green' 
    })
    
    showDeleteModal.value = false
    appToDelete.value = null
    await refresh()
  } catch (e: any) {
    toast.add({ 
      title: 'Delete failed', 
      description: e?.data?.message || e?.message || 'Unknown error',
      color: 'red' 
    })
  } finally {
    deletingAppId.value = null
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusClass(status: string) {
  switch (status) {
    case 'SIGNED':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'SIGNING':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
    case 'FAILED':
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
    default:
      return 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-white/60'
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'SIGNED':
      return 'i-heroicons-check-circle'
    case 'SIGNING':
      return 'i-heroicons-arrow-path'
    case 'FAILED':
      return 'i-heroicons-x-circle'
    default:
      return 'i-heroicons-clock'
  }
}

function installLink(sv: SignedVersion) {
  if (!sv.manifestPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const manifestUrl = `${origin}/api/manifest/${sv.id}`
  return `itms-services://?action=download-manifest&url=${manifestUrl}`
}

function downloadLink(sv: SignedVersion) {
  if (!sv.signedIpaPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/api/download${sv.signedIpaPath}`
}
</script>
