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
            <span class="card-title">Upload New App</span>
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
                <UIcon 
                  :name="uploadProgress === 100 ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-up-tray'" 
                  class="w-4 h-4 text-red-500" 
                  :class="uploadProgress === 100 ? 'animate-spin' : 'animate-bounce'" 
                />
              </div>
              <div>
                <p class="font-medium text-slate-800 dark:text-white">{{ uploadStatus || 'Uploading IPA...' }}</p>
                <p class="text-xs text-slate-500 dark:text-white/50">{{ uploadForm.name || 'New App' }}</p>
              </div>
            </div>
            <span class="text-2xl font-mono font-bold text-red-600 dark:text-red-400">{{ uploadProgress }}%</span>
          </div>
          
          <!-- Chunked upload indicator -->
          <div v-if="totalChunks > 1 && uploadProgress < 100" class="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 text-blue-500" />
            <span class="text-blue-600 dark:text-blue-400">
              Chunk {{ currentChunk }}/{{ totalChunks }}
            </span>
            <div class="flex-1 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-500 rounded-full transition-all duration-150"
                :style="{ width: `${chunkProgress}%` }"
              />
            </div>
            <span class="text-blue-500 font-mono">{{ chunkProgress }}%</span>
          </div>
          
          <!-- Connection status when not yet uploading -->
          <div v-if="uploadProgress === 0 && totalChunks === 0" class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <UIcon name="i-heroicons-signal" class="w-4 h-4 animate-pulse" />
            <span>{{ connectionStatus || 'Connecting to server...' }}</span>
            <span class="ml-auto text-slate-400 font-mono">{{ uploadElapsed }}s</span>
          </div>
          
          <!-- Speed and ETA info -->
          <div v-else-if="uploadProgress > 0 && uploadProgress < 100" class="flex items-center justify-between text-xs text-slate-500 dark:text-white/60">
            <span v-if="uploadSpeed > 0" class="flex items-center gap-1">
              <UIcon name="i-heroicons-bolt" class="w-3 h-3 text-green-500" />
              {{ uploadSpeed >= 1024 * 1024 ? `${(uploadSpeed / 1024 / 1024).toFixed(1)} MB/s` : `${Math.round(uploadSpeed / 1024)} KB/s` }}
            </span>
            <span v-else class="flex items-center gap-1">
              <UIcon name="i-heroicons-signal" class="w-3 h-3 animate-pulse text-amber-500" />
              Starting transfer...
            </span>
            <span v-if="uploadEta" class="flex items-center gap-1">
              <UIcon name="i-heroicons-clock" class="w-3 h-3" />
              {{ uploadEta }}
            </span>
          </div>
          
          <!-- Overall progress bar -->
          <div class="h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-red-500 via-red-600 to-red-500 rounded-full transition-all duration-300 ease-out"
              :class="{ 'animate-pulse': uploadProgress >= 99 && uploadProgress < 100 }"
              :style="{ width: `${Math.max(uploadProgress, uploadProgress === 0 ? 2 : 0)}%` }"
            />
          </div>
          
          <!-- Processing status when upload is complete -->
          <p v-if="uploadProgress === 100" class="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 animate-spin" />
            {{ connectionStatus || uploadStatus || 'Processing IPA on server...' }}
          </p>
          
          <!-- Assembling status -->
          <p v-else-if="uploadProgress >= 99 && totalChunks > 1" class="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            {{ connectionStatus || 'Assembling chunks on server...' }}
          </p>
        </div>
      </UCard>
    </Transition>

    <!-- All Apps List -->
    <UCard class="glass bg-transparent dark:bg-transparent" :ui="{ body: { padding: 'p-3 sm:p-4' }, base: 'overflow-visible border-0 shadow-none' }">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex items-center gap-2 flex-shrink-0">
            <UIcon name="i-heroicons-rectangle-stack" />
            <span class="card-title">All Uploaded Apps</span>
            <UBadge color="gray" variant="soft" size="xs">
              {{ filteredApps.length }}{{ searchQuery ? ` / ${apps?.length || 0}` : '' }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2 flex-1">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search by name, bundle ID..."
              size="sm"
              class="flex-1 max-w-md"
              :ui="{ icon: { trailing: { pointer: '' } } }"
            >
              <template #trailing>
                <UButton
                  v-if="searchQuery"
                  color="gray"
                  variant="link"
                  icon="i-heroicons-x-mark"
                  size="2xs"
                  :padded="false"
                  @click="searchQuery = ''"
                />
              </template>
            </UInput>
            <UButton
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              size="sm"
              :loading="refreshing"
              @click="manualRefresh"
            />
          </div>
        </div>
      </template>

      <div v-if="!apps || apps.length === 0" class="text-center py-8 text-slate-500 dark:text-white/60">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No apps have been uploaded yet.</p>
        <p class="text-sm mt-1">Upload your first IPA using the form above.</p>
      </div>

      <div v-else-if="filteredApps.length === 0" class="text-center py-8 text-slate-500 dark:text-white/60">
        <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No apps match "{{ searchQuery }}"</p>
        <p class="text-sm mt-1">Try a different search term.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="app in filteredApps"
          :key="app.id"
          class="flex items-center gap-4 px-4 py-3 rounded-2xl bg-transparent hover:bg-white/5 dark:hover:bg-white/5 transition-colors group"
        >
          <!-- App Icon with upload overlay - iOS App Store style -->
          <div class="relative flex-shrink-0">
            <img
              v-if="app.iconPath"
              :src="`/api/download${app.iconPath}`"
              :alt="app.name"
              class="w-16 h-16 rounded-2xl shadow-lg object-cover"
            />
            <div v-else class="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center shadow-lg">
              <UIcon :name="app.platform === 'IOS' ? 'i-heroicons-device-phone-mobile' : 'i-heroicons-tv'" class="w-8 h-8 text-slate-400 dark:text-white/40" />
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
          
          <!-- App Info - iOS App Store style -->
          <div class="flex-1 min-w-0">
            <!-- Editable app name -->
            <div v-if="editingAppId === app.id" class="flex items-center gap-2 mb-1">
              <UInput
                v-model="editingAppName"
                size="sm"
                class="font-semibold text-white"
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
            <div v-else class="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3
                class="text-white font-semibold text-base truncate cursor-pointer hover:text-blue-400 transition-colors"
                title="Click to edit name"
                @click="startEditName(app)"
              >
                {{ app.name }}
              </h3>
              <UBadge :color="app.platform === 'IOS' ? 'blue' : 'purple'" variant="soft" size="xs">
                {{ app.platform === 'IOS' ? 'iOS' : 'tvOS' }}
              </UBadge>
            </div>
            <p class="text-sm text-white/60 dark:text-white/60 truncate">
              {{ app.bundleId || 'Unknown bundle' }} • v{{ displayVersion(app) }}
            </p>
            <!-- Signed Versions - Compact inline below subtitle -->
            <div v-if="app.signedVersions.length > 0" class="flex items-center gap-1.5 flex-wrap mt-1.5">
              <div
                v-for="sv in app.signedVersions"
                :key="sv.id"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                :class="statusClass(sv.status)"
              >
                <UIcon
                  :name="statusIcon(sv.status)"
                  class="w-2.5 h-2.5"
                  :class="{ 'animate-spin': sv.status === 'SIGNING' }"
                />
                <span class="font-medium">{{ sv.signerName }}</span>
                <!-- Install/Download buttons for signed versions -->
                <template v-if="sv.status === 'SIGNED'">
                  <a
                    v-if="app.platform === 'IOS' && installLink(sv)"
                    :href="installLink(sv)"
                    class="ml-0.5 hover:opacity-70 transition-opacity"
                    target="_blank"
                    title="Install on device"
                  >
                    <UIcon name="i-heroicons-arrow-down-tray" class="w-2.5 h-2.5" />
                  </a>
                  <a
                    v-else-if="app.platform === 'TVOS' && downloadLink(sv)"
                    :href="downloadLink(sv)"
                    class="ml-0.5 hover:opacity-70 transition-opacity"
                    target="_blank"
                    title="Download"
                  >
                    <UIcon name="i-heroicons-arrow-down-tray" class="w-2.5 h-2.5" />
                  </a>
                </template>
                <!-- Retry button for failed signings -->
                <button
                  v-if="sv.status === 'FAILED'"
                  class="ml-0.5 hover:opacity-70 transition-opacity"
                  title="Retry signing"
                  :disabled="retryingVersionId === sv.id"
                  @click.stop="retrySignedVersion(app.id, sv)"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-2.5 h-2.5" :class="{ 'animate-spin': retryingVersionId === sv.id }" />
                </button>
              </div>
            </div>
          </div>

          <!-- Action buttons - iOS App Store style Sign button -->
          <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div class="flex items-center gap-1.5">
              <!-- Sign button - iOS style -->
              <button
                v-if="!mySignedVersion(app) || mySignedVersion(app)?.status === 'FAILED'"
                class="px-5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                :disabled="signingAppId === app.id"
                @click="signApp(app.id)"
              >
                <UIcon
                  v-if="signingAppId === app.id"
                  name="i-heroicons-arrow-path"
                  class="w-4 h-4 animate-spin"
                />
                <UIcon
                  v-else
                  name="i-heroicons-check-circle"
                  class="w-4 h-4"
                />
                <span>{{ mySignedVersion(app)?.status === 'FAILED' ? 'Retry Sign' : 'Sign' }}</span>
              </button>
              <button
                v-else-if="mySignedVersion(app)?.status === 'SIGNING'"
                class="px-5 py-1.5 rounded-xl bg-gray-600 text-white text-sm font-medium cursor-not-allowed flex items-center gap-1.5"
                disabled
              >
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>Signing...</span>
              </button>
              <button
                v-else-if="mySignedVersion(app)?.status === 'SIGNED'"
                class="px-5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                @click="signApp(app.id)"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                <span>Re-sign</span>
              </button>
              
              <!-- Three-dots menu -->
              <div class="relative">
                <button
                  class="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  @click.stop="openMenuId = openMenuId === app.id ? null : app.id"
                >
                  <UIcon name="i-heroicons-ellipsis-vertical" class="w-5 h-5" />
                </button>
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
                    class="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 dark:ring-white/10 p-1"
                  >
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-left"
                      @click="openNewVersionModal(app); openMenuId = null"
                    >
                      <UIcon name="i-heroicons-arrow-up-on-square" class="w-4 h-4" />
                      Release New Version
                    </button>
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-left"
                      :disabled="signingAllAppId === app.id"
                      @click="signByAllModerators(app.id); openMenuId = null"
                    >
                      <UIcon
                        :name="signingAllAppId === app.id ? 'i-heroicons-arrow-path' : 'i-heroicons-users'"
                        class="w-4 h-4"
                        :class="{ 'animate-spin': signingAllAppId === app.id }"
                      />
                      Sign by All
                    </button>
                    <button
                      class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-left"
                      @click="toggleBuildNumber(app.id); openMenuId = null"
                    >
                      <UIcon :name="app.showBuildNumber ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-4 h-4" />
                      {{ app.showBuildNumber ? 'Hide build number' : 'Show build number' }}
                    </button>
                    <button
                      v-if="canDelete(app)"
                      class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-left text-red-500"
                      @click="confirmDeleteApp(app); openMenuId = null"
                    >
                      <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
            
            <!-- In-App Purchases / Additional info label -->
            <p class="text-[10px] text-white/40 dark:text-white/40">
              {{ app.platform === 'IOS' ? 'iOS' : 'tvOS' }} • by {{ app.owner.nickname }}
            </p>
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
            <span class="card-title">Release New Version</span>
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
            
            <!-- Chunk progress for large files -->
            <div v-if="newVersionTotalChunks > 1 && newVersionUploadProgress < 100" class="flex items-center gap-2 text-xs">
              <UIcon name="i-heroicons-squares-2x2" class="w-3 h-3 text-blue-500" />
              <span class="text-blue-600 dark:text-blue-400">Chunk {{ newVersionCurrentChunk }}/{{ newVersionTotalChunks }}</span>
              <div class="flex-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-blue-500 rounded-full transition-all duration-150"
                  :style="{ width: `${newVersionChunkProgress}%` }"
                />
              </div>
            </div>
            
            <!-- Speed and ETA -->
            <div v-if="newVersionUploadSpeed > 0 && newVersionUploadProgress < 100" class="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-bolt" class="w-3 h-3 text-green-500" />
                {{ newVersionUploadSpeed >= 1024 * 1024 ? `${(newVersionUploadSpeed / 1024 / 1024).toFixed(1)} MB/s` : `${Math.round(newVersionUploadSpeed / 1024)} KB/s` }}
              </span>
              <span v-if="newVersionUploadEta" class="flex items-center gap-1">
                <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                {{ newVersionUploadEta }}
              </span>
            </div>
            
            <div class="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 ease-out"
                :class="{ 'animate-pulse': newVersionUploadProgress >= 99 }"
                :style="{ width: `${newVersionUploadProgress}%` }"
              />
            </div>
            <p v-if="newVersionUploadProgress >= 99" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
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
            <span class="card-title">Delete App</span>
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

// Search state
const searchQuery = ref('')

// Filtered apps based on search query
const filteredApps = computed(() => {
  if (!apps.value) return []
  if (!searchQuery.value.trim()) return apps.value
  
  const query = searchQuery.value.toLowerCase().trim()
  return apps.value.filter(app => 
    app.name.toLowerCase().includes(query) ||
    app.bundleId?.toLowerCase().includes(query) ||
    app.owner.nickname.toLowerCase().includes(query) ||
    app.platform.toLowerCase().includes(query)
  )
})

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
const uploadSpeed = ref(0) // bytes per second
const uploadEta = ref('') // estimated time remaining
const uploadStartTime = ref(0)
const uploadLastBytes = ref(0)
const uploadLastTime = ref(0)
const connectionStatus = ref('') // detailed connection status
const uploadElapsed = ref(0) // elapsed seconds, updated by interval
const currentChunk = ref(0)
const totalChunks = ref(0)
const chunkProgress = ref(0) // progress within current chunk

// Update elapsed time while uploading
let elapsedInterval: ReturnType<typeof setInterval> | null = null
watch(uploading, (isUploading) => {
  if (isUploading) {
    uploadElapsed.value = 0
    elapsedInterval = setInterval(() => {
      if (uploadStartTime.value > 0) {
        uploadElapsed.value = Math.round((Date.now() - uploadStartTime.value) / 1000)
      }
    }, 1000)
  } else {
    if (elapsedInterval) {
      clearInterval(elapsedInterval)
      elapsedInterval = null
    }
  }
})

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
const newVersionCurrentChunk = ref(0)
const newVersionTotalChunks = ref(0)
const newVersionChunkProgress = ref(0)
const newVersionUploadSpeed = ref(0)
const newVersionUploadEta = ref('')
const newVersionLastBytes = ref(0)
const newVersionLastTime = ref(0)

// Upload with progress tracking using XMLHttpRequest
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number, loaded: number, total: number) => void,
  onStatusChange?: (status: string) => void
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let uploadStarted = false
    
    // Track upload start
    xhr.upload.addEventListener('loadstart', () => {
      onStatusChange?.('Establishing connection...')
    })
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        if (!uploadStarted && event.loaded > 0) {
          uploadStarted = true
          onStatusChange?.('Upload in progress...')
        }
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent, event.loaded, event.total)
      }
    })
    
    // When upload finishes, server is now processing
    xhr.upload.addEventListener('load', () => {
      onStatusChange?.('Upload complete, server processing...')
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
          reject({ data: error, statusCode: xhr.status })
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
        }
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error - connection failed or was reset'))
    })
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })
    
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out'))
    })
    
    // Set a generous timeout (30 minutes for large files)
    xhr.timeout = 30 * 60 * 1000
    
    xhr.open('POST', url)
    onStatusChange?.('Sending request...')
    xhr.send(formData)
  })
}

// Chunked upload for large files (bypasses Cloudflare 100MB limit)
const CHUNK_SIZE = 50 * 1024 * 1024 // 50MB chunks

interface ChunkedUploadCallbacks {
  onProgress: (percent: number, loaded: number, total: number) => void
  onStatusChange: (status: string) => void
  onChunkProgress: (chunkIndex: number, totalChunks: number, chunkPercent: number) => void
}

async function uploadChunked(
  file: File,
  metadata: { name: string; platform: string; appId?: string },
  callbacks: ChunkedUploadCallbacks
): Promise<{ id: string }> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  callbacks.onStatusChange(`Preparing ${totalChunks} chunks...`)
  
  let totalUploaded = 0
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const chunk = file.slice(start, end)
    
    callbacks.onStatusChange(`Uploading chunk ${chunkIndex + 1}/${totalChunks}...`)
    
    // Upload this chunk with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const chunkPercent = Math.round((event.loaded / event.total) * 100)
          callbacks.onChunkProgress(chunkIndex, totalChunks, chunkPercent)
          
          // Calculate overall progress
          const chunkContribution = (chunkIndex / totalChunks) * 100
          const thisChunkContribution = (chunkPercent / 100) * (100 / totalChunks)
          const overallPercent = Math.round(chunkContribution + thisChunkContribution)
          const currentLoaded = totalUploaded + event.loaded
          callbacks.onProgress(Math.min(overallPercent, 99), currentLoaded, file.size)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          totalUploaded += (end - start)
          resolve()
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject({ data: error, statusCode: xhr.status })
          } catch {
            reject(new Error(`Chunk upload failed with status ${xhr.status}: ${xhr.statusText}`))
          }
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error(`Network error uploading chunk ${chunkIndex + 1}`))
      })
      
      xhr.addEventListener('timeout', () => {
        reject(new Error(`Timeout uploading chunk ${chunkIndex + 1}`))
      })
      
      xhr.timeout = 5 * 60 * 1000 // 5 minutes per chunk
      
      const formData = new FormData()
      formData.set('uploadId', uploadId)
      formData.set('chunkIndex', String(chunkIndex))
      formData.set('totalChunks', String(totalChunks))
      formData.set('fileName', file.name)
      formData.set('chunk', chunk, file.name)
      
      // Include metadata in first chunk
      if (chunkIndex === 0) {
        formData.set('name', metadata.name)
        formData.set('platform', metadata.platform)
        if (metadata.appId) formData.set('appId', metadata.appId)
      }
      
      xhr.open('POST', '/api/apps/upload-chunk')
      xhr.send(formData)
    })
  }
  
  // All chunks uploaded, finalize
  callbacks.onStatusChange('Assembling file on server...')
  callbacks.onProgress(99, file.size, file.size)
  
  const result = await $fetch<{ id: string }>('/api/apps/upload-finalize', {
    method: 'POST',
    body: {
      uploadId,
      fileName: file.name,
      name: metadata.name,
      platform: metadata.platform,
      appId: metadata.appId
    }
  })
  
  callbacks.onProgress(100, file.size, file.size)
  callbacks.onStatusChange('Processing complete!')
  
  return result
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
  uploadStatus.value = 'Preparing upload...'
  uploadSpeed.value = 0
  uploadEta.value = ''
  uploadStartTime.value = Date.now()
  uploadLastBytes.value = 0
  uploadLastTime.value = Date.now()
  connectionStatus.value = 'Initializing...'
  currentChunk.value = 0
  totalChunks.value = 0
  chunkProgress.value = 0
  
  // Use chunked upload for files > 80MB to stay under Cloudflare's 100MB limit
  const useChunked = file.size > 80 * 1024 * 1024
  
  try {
    let result: { id: string }
    
    if (useChunked) {
      // Chunked upload for large files
      totalChunks.value = Math.ceil(file.size / CHUNK_SIZE)
      
      result = await uploadChunked(
        file,
        { name: uploadForm.name.trim(), platform: uploadForm.platform },
        {
          onProgress: (percent, loaded, total) => {
            uploadProgress.value = percent
            
            // Calculate upload speed
            const now = Date.now()
            const timeDiff = (now - uploadLastTime.value) / 1000
            if (timeDiff >= 0.5) {
              const bytesDiff = loaded - uploadLastBytes.value
              uploadSpeed.value = bytesDiff / timeDiff
              uploadLastBytes.value = loaded
              uploadLastTime.value = now
              
              if (uploadSpeed.value > 0 && percent < 100) {
                const remaining = total - loaded
                const etaSeconds = remaining / uploadSpeed.value
                if (etaSeconds < 60) {
                  uploadEta.value = `${Math.ceil(etaSeconds)}s remaining`
                } else if (etaSeconds < 3600) {
                  uploadEta.value = `${Math.ceil(etaSeconds / 60)}m remaining`
                } else {
                  uploadEta.value = `${Math.floor(etaSeconds / 3600)}h ${Math.ceil((etaSeconds % 3600) / 60)}m remaining`
                }
              }
            }
            
            if (percent < 99) {
              uploadStatus.value = `Uploading... (${Math.round(loaded / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB)`
            } else if (percent < 100) {
              uploadStatus.value = 'Assembling file on server...'
              uploadSpeed.value = 0
              uploadEta.value = ''
            } else {
              uploadStatus.value = 'Processing IPA...'
            }
          },
          onStatusChange: (status) => {
            connectionStatus.value = status
          },
          onChunkProgress: (chunkIdx, total, chunkPct) => {
            currentChunk.value = chunkIdx + 1
            totalChunks.value = total
            chunkProgress.value = chunkPct
          }
        }
      )
    } else {
      // Regular upload for small files
      const body = new FormData()
      body.set('name', uploadForm.name.trim())
      body.set('platform', uploadForm.platform)
      body.set('ipa', file)
      
      // Add optional icon if provided
      const iconFile = iconInput.value?.files?.[0]
      if (iconFile) {
        body.set('icon', iconFile)
      }
      
      result = await uploadWithProgress(
        '/api/apps/upload',
        body,
        (percent, loaded, total) => {
          uploadProgress.value = percent
          
          const now = Date.now()
          const timeDiff = (now - uploadLastTime.value) / 1000
          if (timeDiff >= 0.5) {
            const bytesDiff = loaded - uploadLastBytes.value
            uploadSpeed.value = bytesDiff / timeDiff
            uploadLastBytes.value = loaded
            uploadLastTime.value = now
            
            if (uploadSpeed.value > 0 && percent < 100) {
              const remaining = total - loaded
              const etaSeconds = remaining / uploadSpeed.value
              if (etaSeconds < 60) {
                uploadEta.value = `${Math.ceil(etaSeconds)}s remaining`
              } else if (etaSeconds < 3600) {
                uploadEta.value = `${Math.ceil(etaSeconds / 60)}m remaining`
              } else {
                uploadEta.value = `${Math.floor(etaSeconds / 3600)}h ${Math.ceil((etaSeconds % 3600) / 60)}m remaining`
              }
            }
          }
          
          if (percent < 100) {
            uploadStatus.value = `Uploading IPA file... (${Math.round(loaded / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB)`
          } else {
            uploadStatus.value = 'Processing IPA on server...'
            uploadSpeed.value = 0
            uploadEta.value = ''
          }
        },
        (status) => {
          connectionStatus.value = status
        }
      )
    }
    
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
    uploadSpeed.value = 0
    uploadEta.value = ''
    connectionStatus.value = ''
    currentChunk.value = 0
    totalChunks.value = 0
    chunkProgress.value = 0
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
  newVersionUploadStatus.value = 'Preparing upload...'
  newVersionCurrentChunk.value = 0
  newVersionTotalChunks.value = 0
  newVersionChunkProgress.value = 0
  newVersionUploadSpeed.value = 0
  newVersionUploadEta.value = ''
  newVersionLastBytes.value = 0
  newVersionLastTime.value = Date.now()
  
  // Use chunked upload for files > 80MB
  const useChunked = file.size > 80 * 1024 * 1024
  
  try {
    let result: { id: string }
    
    if (useChunked) {
      newVersionTotalChunks.value = Math.ceil(file.size / CHUNK_SIZE)
      
      result = await uploadChunked(
        file,
        { 
          name: selectedApp.value.name, 
          platform: selectedApp.value.platform,
          appId: selectedApp.value.id
        },
        {
          onProgress: (percent, loaded, total) => {
            newVersionUploadProgress.value = percent
            
            const now = Date.now()
            const timeDiff = (now - newVersionLastTime.value) / 1000
            if (timeDiff >= 0.5) {
              const bytesDiff = loaded - newVersionLastBytes.value
              newVersionUploadSpeed.value = bytesDiff / timeDiff
              newVersionLastBytes.value = loaded
              newVersionLastTime.value = now
              
              if (newVersionUploadSpeed.value > 0 && percent < 100) {
                const remaining = total - loaded
                const etaSeconds = remaining / newVersionUploadSpeed.value
                if (etaSeconds < 60) {
                  newVersionUploadEta.value = `${Math.ceil(etaSeconds)}s`
                } else {
                  newVersionUploadEta.value = `${Math.ceil(etaSeconds / 60)}m`
                }
              }
            }
            
            if (percent < 99) {
              newVersionUploadStatus.value = `Uploading... (${Math.round(loaded / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB)`
            } else if (percent < 100) {
              newVersionUploadStatus.value = 'Assembling file...'
            } else {
              newVersionUploadStatus.value = 'Processing IPA...'
            }
          },
          onStatusChange: (status) => {
            // Could show connection status if needed
          },
          onChunkProgress: (chunkIdx, total, chunkPct) => {
            newVersionCurrentChunk.value = chunkIdx + 1
            newVersionTotalChunks.value = total
            newVersionChunkProgress.value = chunkPct
          }
        }
      )
    } else {
      const body = new FormData()
      body.set('appId', selectedApp.value.id)
      body.set('name', selectedApp.value.name)
      body.set('platform', selectedApp.value.platform)
      body.set('ipa', file)
      
      const iconFile = newVersionIconInput.value?.files?.[0]
      if (iconFile) {
        body.set('icon', iconFile)
      }
      
      result = await uploadWithProgress(
        '/api/apps/upload',
        body,
        (percent, loaded, total) => {
          newVersionUploadProgress.value = percent
          
          const now = Date.now()
          const timeDiff = (now - newVersionLastTime.value) / 1000
          if (timeDiff >= 0.5) {
            const bytesDiff = loaded - newVersionLastBytes.value
            newVersionUploadSpeed.value = bytesDiff / timeDiff
            newVersionLastBytes.value = loaded
            newVersionLastTime.value = now
          }
          
          if (percent < 100) {
            newVersionUploadStatus.value = `Uploading... (${Math.round(loaded / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB)`
          } else {
            newVersionUploadStatus.value = 'Processing IPA on server...'
          }
        }
      )
    }
    
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
    newVersionCurrentChunk.value = 0
    newVersionTotalChunks.value = 0
    newVersionChunkProgress.value = 0
    newVersionUploadSpeed.value = 0
    newVersionUploadEta.value = ''
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

function formatDateShort(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
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
