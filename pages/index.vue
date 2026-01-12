<template>
  <div class="mt-10 px-5 max-w-7xl mx-auto space-y-10">
    <!-- Welcome Section - Collapsible when moderator is selected -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-violet-500/10 to-red-500/10 dark:from-red-500/20 dark:via-violet-500/20 dark:to-red-500/20 border border-white/10 transition-all">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/5 via-transparent to-transparent"></div>
      
      <!-- Collapsed View (when moderator is selected) -->
      <div v-if="selectedModeratorId && !welcomeExpanded" class="relative p-5 md:p-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-500 to-violet-500 bg-clip-text text-transparent">
              Vítejte ve FastSigner
            </h1>
            <p class="text-sm text-slate-600 dark:text-white/70 mt-1">
              Vaše místo pro sideloading aplikací na Apple zařízení
            </p>
          </div>
          <UButton
            icon="i-heroicons-chevron-down"
            color="gray"
            variant="ghost"
            size="sm"
            @click="welcomeExpanded = true"
            class="flex-shrink-0"
          />
        </div>
      </div>

      <!-- Expanded View (default or when clicked) -->
      <div v-else class="relative p-5 md:p-8 space-y-4 md:space-y-6">
        <div class="flex items-start justify-between gap-4">
          <div class="text-center flex-1 space-y-2 md:space-y-3">
            <h1 class="page-title-gradient">
              Vítejte ve FastSigner
            </h1>
            <p class="text-sm md:text-lg text-slate-600 dark:text-white/70 max-w-2xl mx-auto">
              Vaše místo pro sideloading aplikací na Apple zařízení
            </p>
          </div>
          <UButton
            v-if="selectedModeratorId"
            icon="i-heroicons-chevron-up"
            color="gray"
            variant="ghost"
            size="sm"
            @click="welcomeExpanded = false"
            class="flex-shrink-0"
          />
        </div>

        <!-- Mobile: compact horizontal layout -->
        <div class="flex md:hidden justify-center gap-6">
          <div class="flex flex-col items-center gap-1">
            <div class="p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <UIcon name="i-heroicons-device-phone-mobile" class="w-6 h-6 text-red-500" />
            </div>
            <span class="text-xs font-medium text-slate-700 dark:text-white/80">Aplikace</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <UIcon name="i-heroicons-shield-check" class="w-6 h-6 text-red-500" />
            </div>
            <span class="text-xs font-medium text-slate-700 dark:text-white/80">Certifikáty</span>
          </div>
          <div class="flex flex-col items-center gap-1">
            <div class="p-3 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
              <UIcon name="i-heroicons-user-group" class="w-6 h-6 text-red-500" />
            </div>
            <span class="text-xs font-medium text-slate-700 dark:text-white/80">Komunita</span>
          </div>
        </div>
        
        <!-- Desktop: full cards layout -->
        <div class="hidden md:grid md:grid-cols-3 gap-4 text-center">
          <div class="p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <UIcon name="i-heroicons-device-phone-mobile" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 class="card-subtitle">Podepsané aplikace</h3>
            <p class="text-sm text-slate-500 dark:text-white/60">Pro iPhone, iPad, Apple TV a Mac</p>
          </div>
          <div class="p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <UIcon name="i-heroicons-shield-check" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 class="card-subtitle">Certifikáty & Profily</h3>
            <p class="text-sm text-slate-500 dark:text-white/60">Vše potřebné pro instalaci</p>
          </div>
          <div class="p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 class="card-subtitle">Komunita</h3>
            <p class="text-sm text-slate-500 dark:text-white/60">Podpora a novinky na Discordu</p>
          </div>
        </div>

        <div class="bg-violet-500/10 dark:bg-violet-500/20 rounded-xl p-4 md:p-5 border border-violet-500/20">
          <div class="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div class="flex items-start gap-2 md:gap-3">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5 md:w-6 md:h-6 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 class="card-title text-sm md:text-base">Před prvním použitím</h3>
                <p class="text-xs md:text-sm text-slate-600 dark:text-white/70">
                  Pro registraci zařízení a získání přístupu je nutné se nejprve připojit na náš Discord server.
                </p>
              </div>
            </div>
            <UButton
              to="https://discord.gg/cSZhdNJTEf"
              target="_blank"
              color="violet"
              variant="solid"
              size="md"
              class="group flex-shrink-0 w-full md:w-auto justify-center"
            >
              <svg class="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Připojit se na Discord
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Skeleton Loading State -->
    <template v-if="pending">
      <div class="space-y-6">
        <USkeleton class="h-12 w-64 mx-auto rounded-xl" />
        <div class="flex gap-2 justify-center">
          <USkeleton class="h-10 w-32 rounded-lg" />
          <USkeleton class="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </template>

    <!-- Moderator Selection -->
    <template v-else-if="moderators && moderators.length > 0">
      <div class="space-y-4 relative z-50">
        <!-- Combined Moderator Selection & Info -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 p-4 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/10">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div class="flex items-center gap-2 md:flex-shrink-0">
              <div class="p-1.5 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                <UIcon name="i-heroicons-user-circle" class="text-red-500 dark:text-red-400 w-5 h-5" />
              </div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Moderátor</h2>
            </div>
            
            <div class="flex-1 sm:max-w-sm">
              <USelectMenu
                v-model="selectedModeratorId"
                :options="moderators"
                value-attribute="id"
                option-attribute="name"
                searchable
                searchable-placeholder="Hledat moderátora..."
                placeholder="Vyberte moderátora..."
                size="lg"
                :ui="{
                  width: 'w-full',
                  height: 'max-h-60',
                  base: 'cursor-pointer',
                  option: {
                    base: 'cursor-pointer',
                    active: 'bg-red-500/10 dark:bg-red-500/20',
                    selected: 'bg-red-500/20 dark:bg-red-500/30'
                  }
                }"
                :uiMenu="{ 
                  width: 'w-full',
                  height: 'max-h-60',
                  base: 'z-[9999]'
                }"
                @update:model-value="onModeratorChange"
              >
                <template #leading>
                  <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-red-500" />
                </template>
                <template #option="{ option }">
                  <div class="flex items-center justify-between w-full gap-2">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <span class="truncate">{{ option.name }}</span>
                      <UBadge 
                        v-if="isUserRegisteredWith(option.id)" 
                        color="green" 
                        variant="subtle" 
                        size="xs"
                      >
                        Registered
                      </UBadge>
                    </div>
                  </div>
                </template>
                <template #label>
                  <span v-if="selectedModerator">
                    {{ selectedModerator.name }}
                  </span>
                  <span v-else class="text-slate-500 dark:text-white/60">Vyberte moderátora...</span>
                </template>
              </USelectMenu>
            </div>
          </div>

          <!-- Selected Moderator Info - Only show when selected and user is logged in -->
          <div v-if="selectedModerator && user" class="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-4">
            <UButton 
              icon="i-heroicons-information-circle" 
              variant="ghost" 
              color="gray" 
              size="sm"
              @click="openModeratorModal(selectedModerator)"
            >
              Informace o moderátorovi
            </UButton>
          </div>
        </div>
      </div>

      <!-- Selected Moderator Apps - Only show after selection -->
      <div v-if="selectedModerator" class="space-y-6">

        <!-- Search Bar + Platform Tabs -->
        <div class="space-y-3">
          <!-- Tabs with desktop search integrated -->
          <div class="relative space-y-2 w-full lg:pr-1">
            <!-- Desktop search integrated in tablist -->
            <div class="relative hidden lg:block">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                size="lg"
                placeholder="Hledat aplikace..."
                :ui="{ icon: { trailing: { pointer: '' } } }"
              >
                <template #trailing>
                  <UButton
                    v-show="searchQuery !== ''"
                    color="gray"
                    variant="link"
                    icon="i-heroicons-x-mark-20-solid"
                    :padded="false"
                    @click="searchQuery = ''"
                  />
                </template>
              </UInput>
            </div>
            <UTabs v-model="selectedTab" :items="tabItems" class="w-full">
              <template #item="{ item }">
                <div class="space-y-4 pt-6">
                  <div v-if="item.apps.length === 0" class="text-center py-12 text-slate-500 dark:text-white/60">
                    <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{{ searchQuery ? 'Žádné aplikace nenalezeny' : `Žádné ${item.label} aplikace` }}</p>
                  </div>
                  
                  <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    <div
                      v-for="app in item.apps"
                      :key="app.id"
                      class="rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden transition-all"
                      :class="item.key === 'ios' ? 'hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10' : 'hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10'"
                    >
                      <div class="flex items-center gap-3 p-4">
                        <!-- App Icon -->
                        <div class="flex-shrink-0">
                          <img
                            v-if="app.iconPath"
                            :src="`/api/download${app.iconPath}`"
                            :alt="app.name"
                            class="w-14 h-14 rounded-2xl shadow-sm object-cover"
                          />
                          <div v-else class="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5 flex items-center justify-center shadow-sm">
                            <UIcon :name="item.key === 'ios' ? 'i-heroicons-device-phone-mobile' : 'i-heroicons-tv'" class="w-7 h-7 text-slate-400 dark:text-white/40" />
                          </div>
                        </div>
                        
                        <!-- App Info -->
                        <div class="flex-1 min-w-0">
                          <h4 class="font-semibold text-sm text-slate-900 dark:text-white truncate">{{ app.name }}</h4>
                          <p class="text-xs text-slate-500 dark:text-white/60 mt-0.5 truncate">
                            {{ displayVersion(app) || (item.key === 'ios' ? 'iOS App' : 'Apple TV App') }}
                          </p>
                          <!-- Premium badge (only for apps marked as loggedInOnly) -->
                          <div
                            v-if="app.loggedInOnly && selectedModerator && user"
                            class="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200 px-2 py-0.5 text-[10px] font-medium"
                          >
                            <UIcon name="i-heroicons-star" class="w-3 h-3" />
                            <span>Premium</span>
                          </div>
                        </div>
                        
                        <!-- Install/Download Button -->
                        <div class="flex-shrink-0">
                          <a
                            v-if="item.key === 'ios' && app.status === 'SIGNED' && installLink(app)"
                            :href="installLink(app)"
                            class="inline-flex items-center justify-center min-w-[70px] h-8 px-3 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 transition-colors"
                            title="Install on device"
                          >
                            <span class="text-sm font-semibold text-white">GET</span>
                          </a>
                          <a
                            v-else-if="item.key === 'appletv' && app.status === 'SIGNED' && tvosLink(app)"
                            :href="tvosLink(app)"
                            target="_blank"
                            class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 transition-colors"
                            title="Download IPA"
                          >
                            <UIcon name="i-heroicons-cloud-arrow-down" class="w-4 h-4 text-white" />
                          </a>
                          <div
                            v-else
                            class="inline-flex items-center justify-center min-w-[70px] h-8 px-3 rounded-full bg-slate-300/50 dark:bg-slate-700/50 cursor-not-allowed"
                          >
                            <span class="text-xs text-slate-400 dark:text-slate-500">—</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </UTabs>
          </div>

          <!-- Mobile search: separate row below tabs -->
          <div class="lg:hidden">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              size="lg"
              placeholder="Hledat aplikace..."
              :ui="{ icon: { trailing: { pointer: '' } } }"
            >
              <template #trailing>
                <UButton
                  v-show="searchQuery !== ''"
                  color="gray"
                  variant="link"
                  icon="i-heroicons-x-mark-20-solid"
                  :padded="false"
                  @click="searchQuery = ''"
                />
              </template>
            </UInput>
          </div>
        </div>

        <!-- Platform Tabs Content -->
        <!-- (content is rendered inside UTabs above) -->
        <!-- Keeping outer container spacing for consistency -->
        <!-- End Search + Tabs section -->

        <!-- (rest of the content inside the selected tab remains unchanged) -->
      </div>
    </template>

    <div v-else class="text-center text-slate-500 dark:text-white/70 py-12">
      No moderators or apps available yet.
    </div>

    <!-- Moderator Info Modal -->
    <UModal v-model="showModeratorModal" :ui="{ width: 'max-w-2xl' }">
      <UCard class="glass" v-if="modalModerator">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" />
            <span class="card-title">{{ modalModerator.name }}</span>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Device Counts Section -->
          <div v-if="modalModerator.deviceCounts" class="space-y-3">
            <div class="pb-2 border-b border-slate-200 dark:border-white/10">
              <span class="subsection-title text-base mb-0 mt-0 pb-0 border-0">Registrovaná zařízení</span>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-device-phone-mobile" class="text-blue-500 dark:text-blue-400 w-5 h-5" />
                <span class="text-sm">iOS</span>
                <UBadge color="blue" variant="soft" size="sm">{{ modalModerator.deviceCounts.iOS }}/100</UBadge>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-tv" class="text-slate-500 dark:text-gray-400 w-5 h-5" />
                <span class="text-sm">Apple TV</span>
                <UBadge color="gray" variant="soft" size="sm">{{ modalModerator.deviceCounts.APPLE_TV }}/100</UBadge>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-computer-desktop" class="text-emerald-500 dark:text-green-400 w-5 h-5" />
                <span class="text-sm">Mac</span>
                <UBadge color="emerald" variant="soft" size="sm">{{ modalModerator.deviceCounts.MAC }}/100</UBadge>
              </div>
            </div>
          </div>

          <!-- Certificates Section -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
              <UIcon name="i-heroicons-identification" class="text-red-500 w-5 h-5" />
              <span class="subsection-title text-base mb-0 mt-0 pb-0 border-0">Certifikáty</span>
            </div>
            <div v-if="(!modalModerator.certificates || modalModerator.certificates.length === 0) && !modalModerator.hasManagerProfileCertificate" class="text-sm text-slate-500 dark:text-white/60">
              Žádné certifikáty
            </div>
            <div v-else class="space-y-3">
              <div 
                v-for="cert in modalModerator.certificates" 
                :key="cert.id"
                class="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-base font-medium truncate">{{ cert.displayName || 'Certifikát' }}</div>
                  <div v-if="cert.expiresAt" class="text-sm mt-1" :class="isCertExpiringSoon(cert.expiresAt) ? 'text-orange-400' : 'text-slate-500 dark:text-white/60'">
                    Platnost do {{ formatDateShort(cert.expiresAt) }}
                  </div>
                </div>
                <UButton 
                  size="sm" 
                  color="red" 
                  variant="solid"
                  icon="i-heroicons-arrow-down-tray"
                  @click="downloadModeratorCertificate(modalModerator.id, cert.displayName || 'certificate')"
                >
                  Stáhnout
                </UButton>
              </div>
              <!-- Legacy managerProfile certificate -->
              <div 
                v-if="modalModerator.hasManagerProfileCertificate && (!modalModerator.certificates || modalModerator.certificates.length === 0)"
                class="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-base font-medium truncate">Certifikát</div>
                  <div v-if="modalModerator.certificateExpiresAt" class="text-sm mt-1" :class="isCertExpiringSoon(modalModerator.certificateExpiresAt) ? 'text-orange-400' : 'text-slate-500 dark:text-white/60'">
                    Platnost do {{ formatDateShort(modalModerator.certificateExpiresAt) }}
                  </div>
                </div>
                <UButton 
                  size="sm" 
                  color="red" 
                  variant="solid"
                  icon="i-heroicons-arrow-down-tray"
                  @click="downloadModeratorCertificate(modalModerator.id, modalModerator.name || 'certificate')"
                >
                  Stáhnout
                </UButton>
              </div>
            </div>
          </div>

          <!-- Profiles Section -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
              <UIcon name="i-heroicons-document-text" class="text-red-500 w-5 h-5" />
              <span class="subsection-title text-base mb-0 mt-0 pb-0 border-0">Profily</span>
            </div>
            <div v-if="(!modalModerator.profiles || modalModerator.profiles.length === 0) && !modalModerator.hasManagerProfileIos && !modalModerator.hasManagerProfileTvos" class="text-sm text-slate-500 dark:text-white/60">
              Žádné profily
            </div>
            <div v-else class="space-y-3">
              <div 
                v-for="profile in modalModerator.profiles" 
                :key="profile.id"
                class="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-base font-medium truncate">{{ profile.name || 'Profil' }}</div>
                    <div class="text-sm mt-1 text-slate-500 dark:text-white/60">
                      {{ profile.platform === 'IOS' ? 'iOS' : 'tvOS' }}
                      <span v-if="profile.expiresAt"> • {{ formatDateShort(profile.expiresAt) }}</span>
                    </div>
                  </div>
                  <UButton 
                    size="sm" 
                    color="red" 
                    variant="solid"
                    icon="i-heroicons-arrow-down-tray"
                    @click="downloadModeratorProfile(modalModerator.id, profile.platform, profile.name || 'profile')"
                  >
                    Stáhnout
                  </UButton>
                </div>
                
                <!-- UDID Check Section -->
                <div class="border-t border-white/5 pt-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs text-slate-500 dark:text-white/50">Zkontrolujte, zda je vaše UDID v profilu:</label>
                    <div class="flex gap-2">
                      <UInput 
                        v-model="udidChecks[getProfileKey(modalModerator.id, profile.platform)]" 
                        placeholder="Zadejte UDID" 
                        size="sm" 
                        class="flex-1 font-mono text-xs"
                      />
                      <UButton 
                        size="sm" 
                        color="blue" 
                        variant="soft" 
                        :loading="checkingUdid[getProfileKey(modalModerator.id, profile.platform)]"
                        @click="checkUdidInProfile(modalModerator.id, profile.platform)"
                        :disabled="!udidChecks[getProfileKey(modalModerator.id, profile.platform)]?.trim()"
                      >
                        Zkontrolovat
                      </UButton>
                    </div>
                    <div v-if="udidResults[getProfileKey(modalModerator.id, profile.platform)]?.checked" class="flex items-center gap-2">
                      <UIcon 
                        :name="udidResults[getProfileKey(modalModerator.id, profile.platform)].found ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                        :class="udidResults[getProfileKey(modalModerator.id, profile.platform)].found ? 'text-green-400' : 'text-red-400'"
                        class="w-4 h-4"
                      />
                      <span 
                        :class="udidResults[getProfileKey(modalModerator.id, profile.platform)].found ? 'text-green-400' : 'text-red-400'" 
                        class="text-sm"
                      >
                        {{ udidResults[getProfileKey(modalModerator.id, profile.platform)].message }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Legacy managerProfile profiles -->
              <div 
                v-if="modalModerator.hasManagerProfileIos && (!modalModerator.profiles || !modalModerator.profiles.some(p => p.platform === 'IOS'))"
                class="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-base font-medium truncate">iOS Profil</div>
                  </div>
                  <UButton 
                    size="sm" 
                    color="red" 
                    variant="solid"
                    icon="i-heroicons-arrow-down-tray"
                    @click="downloadModeratorProfile(modalModerator.id, 'IOS', 'ios_profile')"
                  >
                    Stáhnout
                  </UButton>
                </div>
                
                <!-- UDID Check Section -->
                <div class="border-t border-white/5 pt-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs text-slate-500 dark:text-white/50">Zkontrolujte, zda je vaše UDID v profilu:</label>
                    <div class="flex gap-2">
                      <UInput 
                        v-model="udidChecks[getProfileKey(modalModerator.id, 'IOS')]" 
                        placeholder="Zadejte UDID" 
                        size="sm" 
                        class="flex-1 font-mono text-xs"
                      />
                      <UButton 
                        size="sm" 
                        color="blue" 
                        variant="soft" 
                        :loading="checkingUdid[getProfileKey(modalModerator.id, 'IOS')]"
                        @click="checkUdidInProfile(modalModerator.id, 'IOS')"
                        :disabled="!udidChecks[getProfileKey(modalModerator.id, 'IOS')]?.trim()"
                      >
                        Zkontrolovat
                      </UButton>
                    </div>
                    <div v-if="udidResults[getProfileKey(modalModerator.id, 'IOS')]?.checked" class="flex items-center gap-2">
                      <UIcon 
                        :name="udidResults[getProfileKey(modalModerator.id, 'IOS')].found ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                        :class="udidResults[getProfileKey(modalModerator.id, 'IOS')].found ? 'text-green-400' : 'text-red-400'"
                        class="w-4 h-4"
                      />
                      <span 
                        :class="udidResults[getProfileKey(modalModerator.id, 'IOS')].found ? 'text-green-400' : 'text-red-400'" 
                        class="text-sm"
                      >
                        {{ udidResults[getProfileKey(modalModerator.id, 'IOS')].message }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                v-if="modalModerator.hasManagerProfileTvos && (!modalModerator.profiles || !modalModerator.profiles.some(p => p.platform === 'TVOS'))"
                class="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-base font-medium truncate">tvOS Profil</div>
                  </div>
                  <UButton 
                    size="sm" 
                    color="red" 
                    variant="solid"
                    icon="i-heroicons-arrow-down-tray"
                    @click="downloadModeratorProfile(modalModerator.id, 'TVOS', 'tvos_profile')"
                  >
                    Stáhnout
                  </UButton>
                </div>
                
                <!-- UDID Check Section -->
                <div class="border-t border-white/5 pt-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-xs text-slate-500 dark:text-white/50">Zkontrolujte, zda je vaše UDID v profilu:</label>
                    <div class="flex gap-2">
                      <UInput 
                        v-model="udidChecks[getProfileKey(modalModerator.id, 'TVOS')]" 
                        placeholder="Zadejte UDID" 
                        size="sm" 
                        class="flex-1 font-mono text-xs"
                      />
                      <UButton 
                        size="sm" 
                        color="blue" 
                        variant="soft" 
                        :loading="checkingUdid[getProfileKey(modalModerator.id, 'TVOS')]"
                        @click="checkUdidInProfile(modalModerator.id, 'TVOS')"
                        :disabled="!udidChecks[getProfileKey(modalModerator.id, 'TVOS')]?.trim()"
                      >
                        Zkontrolovat
                      </UButton>
                    </div>
                    <div v-if="udidResults[getProfileKey(modalModerator.id, 'TVOS')]?.checked" class="flex items-center gap-2">
                      <UIcon 
                        :name="udidResults[getProfileKey(modalModerator.id, 'TVOS')].found ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                        :class="udidResults[getProfileKey(modalModerator.id, 'TVOS')].found ? 'text-green-400' : 'text-red-400'"
                        class="w-4 h-4"
                      />
                      <span 
                        :class="udidResults[getProfileKey(modalModerator.id, 'TVOS')].found ? 'text-green-400' : 'text-red-400'" 
                        class="text-sm"
                      >
                        {{ udidResults[getProfileKey(modalModerator.id, 'TVOS')].message }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton color="gray" variant="ghost" @click="showModeratorModal = false">Zavřít</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Footer Disclaimer -->
    <footer class="mt-16 pb-10 border-t border-slate-200 dark:border-white/10 pt-8">
      <div class="flex flex-col items-center gap-4 text-center">
        <UIcon name="i-heroicons-shield-exclamation" class="w-8 h-8 text-slate-400 dark:text-white/40" />
        <div class="max-w-2xl space-y-2">
          <h4 class="card-subtitle text-slate-600 dark:text-white/70">Prohlášení o odpovědnosti</h4>
          <p class="text-sm text-slate-500 dark:text-white/50 leading-relaxed">
            Provozovatel tohoto webu nenese žádnou odpovědnost za obsah, funkčnost ani legálnost aplikací zde poskytovaných. 
            Aplikace jsou nahrávány třetími stranami a provozovatel není jejich autorem ani distributorem. 
            Používání aplikací je na vlastní riziko uživatele.
          </p>
        </div>
        <p class="text-xs text-slate-400 dark:text-white/30 mt-4">
          © {{ new Date().getFullYear() }} FastSigner
        </p>
      </div>
    </footer>
  </div>
  
</template>

<script setup lang="ts">
type PublicApp = { id: string; name: string; version: string; buildNumber?: string | null; showBuildNumber: boolean; loggedInOnly: boolean; platform: 'IOS' | 'TVOS'; uploadedAt: string; manifestPath?: string | null; downloadPath?: string | null; status: string; iconPath?: string | null }
type DeviceCounts = {
  iOS: number      // iPhone + iPad
  APPLE_TV: number
  MAC: number
  total: number
}
type PublicModerator = {
  id: string
  name: string
  iosApps: PublicApp[]
  tvosApps: PublicApp[]
  profileUpdatedAt: string | null
  profileAvailable: boolean
  certificateExpiresAt: string | null
  deviceCounts: DeviceCounts | null
  certificates: Array<{ id: string; displayName: string | null; expiresAt: string | null }>
  profiles: Array<{ id: string; name: string | null; platform: 'IOS' | 'TVOS'; expiresAt: string | null }>
  hasManagerProfileCertificate: boolean
  hasManagerProfileIos: boolean
  hasManagerProfileTvos: boolean
}

const { data: moderators, status } = useFetch<PublicModerator[]>('/api/public/moderators', { lazy: true })
const pending = computed(() => status.value === 'pending')
const { public: publicConfig } = useRuntimeConfig()
const { user } = useAuth()

// Welcome section state
const welcomeExpanded = ref(false)

// Moderator selection (saved in cookie for SSR support)
const selectedModeratorId = useCookie<string | null>('fastsigner-selected-moderator', {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax',
  default: () => null
})

// Fetch Discord user's registrations for auto-selection
const { data: userRegistrations } = await useFetch('/api/my-registrations', {
  lazy: true,
  server: false, // Client-side only
  // Only fetch if user is logged in with Discord
  immediate: computed(() => user.value?.authProvider === 'discord')
})

// Migrate from old localStorage to cookie (client-side only)
onMounted(() => {
  if (process.client && typeof window !== 'undefined') {
    const oldStorageKey = 'fastsigner-selected-moderator'
    const oldValue = localStorage.getItem(oldStorageKey)
    if (oldValue && !selectedModeratorId.value) {
      selectedModeratorId.value = oldValue
      localStorage.removeItem(oldStorageKey) // Clean up old storage
    }
  }
})

// Validate saved moderator when data loads
watch(moderators, (newModerators) => {
  if (newModerators && newModerators.length > 0) {
    // Validate that saved moderator exists
    if (selectedModeratorId.value && !newModerators.some(m => m.id === selectedModeratorId.value)) {
      selectedModeratorId.value = null
    }
  }
}, { immediate: true })

// Auto-select moderator for Discord users
watch([moderators, userRegistrations], ([newModerators, newRegistrations]) => {
  // Only auto-select if:
  // 1. No moderator is currently selected
  // 2. User has registrations
  // 3. Moderators list is loaded
  if (!selectedModeratorId.value && newRegistrations?.moderators && newModerators) {
    const userModeratorIds = newRegistrations.moderators.map((m: any) => m.moderatorId)
    
    if (userModeratorIds.length === 1) {
      // If user is registered with only one moderator, auto-select it
      selectedModeratorId.value = userModeratorIds[0]
    } else if (userModeratorIds.length > 1) {
      // If user is registered with multiple moderators, select the first available one
      const firstAvailable = userModeratorIds.find((id: string) => 
        newModerators.some(m => m.id === id)
      )
      if (firstAvailable) {
        selectedModeratorId.value = firstAvailable
      }
    }
  }
}, { immediate: true })

const selectedModerator = computed(() => {
  if (!selectedModeratorId.value || !moderators.value) return null
  return moderators.value.find(m => m.id === selectedModeratorId.value) || null
})

function onModeratorChange(id: string) {
  selectedModeratorId.value = id
  // Reset search when switching moderators
  searchQuery.value = ''
  // Collapse welcome section
  welcomeExpanded.value = false
}

// Search functionality
const searchQuery = ref('')

const filteredIosApps = computed(() => {
  if (!selectedModerator.value) return []

  // Check if user is logged in, a moderator, or registered
  const isModerator = user.value && (user.value.role === 'MANAGER' || user.value.role === 'SUPERADMIN')
  const isLoggedIn = !!user.value
  const isRegistered = selectedModerator.value ? isUserRegisteredWith(selectedModerator.value.id) : false
  
  // Show hidden apps if user is logged in, is a moderator, or is registered
  // Note: API already filters hidden apps for non-logged-in users, so if they're in the array, user is logged in
  const canSeeHiddenApps = isLoggedIn || isModerator || isRegistered
  const baseApps = selectedModerator.value.iosApps.filter(app => !app.loggedInOnly || canSeeHiddenApps)

  if (!searchQuery.value.trim()) return baseApps
  
  const query = searchQuery.value.toLowerCase()
  return baseApps.filter(app => 
    app.name.toLowerCase().includes(query) || 
    app.version.toLowerCase().includes(query) ||
    (app.buildNumber && app.buildNumber.toLowerCase().includes(query))
  )
})

const filteredTvosApps = computed(() => {
  if (!selectedModerator.value) return []

  // Check if user is logged in, a moderator, or registered
  const isModerator = user.value && (user.value.role === 'MANAGER' || user.value.role === 'SUPERADMIN')
  const isLoggedIn = !!user.value
  const isRegistered = selectedModerator.value ? isUserRegisteredWith(selectedModerator.value.id) : false
  
  // Show hidden apps if user is logged in, is a moderator, or is registered
  // Note: API already filters hidden apps for non-logged-in users, so if they're in the array, user is logged in
  const canSeeHiddenApps = isLoggedIn || isModerator || isRegistered
  const baseApps = selectedModerator.value.tvosApps.filter(app => !app.loggedInOnly || canSeeHiddenApps)

  if (!searchQuery.value.trim()) return baseApps
  
  const query = searchQuery.value.toLowerCase()
  return baseApps.filter(app => 
    app.name.toLowerCase().includes(query) || 
    app.version.toLowerCase().includes(query) ||
    (app.buildNumber && app.buildNumber.toLowerCase().includes(query))
  )
})

// Tabs with dynamic items
const selectedTab = ref(0)
const tabItems = computed(() => {
  const iosCount = selectedModerator.value?.iosApps.length || 0
  const tvosCount = selectedModerator.value?.tvosApps.length || 0
  
  return [
    {
      key: 'ios',
      label: `iOS (${iosCount})`,
      icon: 'i-heroicons-device-phone-mobile',
      apps: filteredIosApps.value
    },
    {
      key: 'appletv',
      label: `Apple TV (${tvosCount})`,
      icon: 'i-heroicons-tv',
      apps: filteredTvosApps.value
    }
  ]
})

// Modal
const showModeratorModal = ref(false)
const modalModerator = ref<PublicModerator | null>(null)

// UDID checking state
const udidChecks = ref<Record<string, string>>({})
const checkingUdid = ref<Record<string, boolean>>({})
const udidResults = ref<Record<string, { checked: boolean; found: boolean; message?: string }>>({})

function openModeratorModal(mod: PublicModerator) {
  modalModerator.value = mod
  showModeratorModal.value = true
}

function getProfileKey(moderatorId: string, platform: 'IOS' | 'TVOS'): string {
  return `${moderatorId}-${platform}`
}

function installLink(app: PublicApp) {
  if (!app.manifestPath) return undefined
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const manifestUrl = `${origin}/api/manifest/${app.id}`
  return `itms-services://?action=download-manifest&url=${manifestUrl}`
}

function tvosLink(app: PublicApp) {
  const origin = (publicConfig?.baseUrl && publicConfig.baseUrl.length > 0)
    ? publicConfig.baseUrl.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const path = app.downloadPath || ''
  if (!path) return undefined
  return `${origin}/api/download${path}`
}

function formatDateShort(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

function isCertExpiringSoon(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  const daysUntilExpiry = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntilExpiry <= 30 // Warn if expiring within 30 days
}

function displayVersion(app: PublicApp) {
  const hasVersion = typeof app.version === 'string' && app.version.length > 0
  const hasBuild = typeof app.buildNumber === 'string' && app.buildNumber.length > 0
  
  if (hasVersion && hasBuild && app.showBuildNumber && app.version !== app.buildNumber) {
    return `v${app.version} (${app.buildNumber})`
  }
  return hasVersion ? `v${app.version}` : (hasBuild ? `v${app.buildNumber}` : '')
}

async function downloadModeratorCertificate(moderatorId: string, displayName: string) {
  try {
    const response = await fetch(`/api/public/moderators/${moderatorId}/certificate.download`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Nepodařilo se stáhnout certifikát' }))
      throw new Error(error.message || 'Nepodařilo se stáhnout certifikát')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${displayName.replace(/[^a-zA-Z0-9]/g, '_')}.${blob.type.includes('pem') ? 'pem' : 'p12'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e: any) {
    useToast().add({ 
      title: 'Chyba', 
      description: e?.message || 'Nepodařilo se stáhnout certifikát', 
      color: 'red' 
    })
  }
}

async function downloadModeratorProfile(moderatorId: string, platform: 'IOS' | 'TVOS', profileName: string) {
  try {
    const response = await fetch(`/api/public/moderators/${moderatorId}/profile.download?platform=${platform}`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Nepodařilo se stáhnout profil' }))
      throw new Error(error.message || 'Nepodařilo se stáhnout profil')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profileName.replace(/[^a-zA-Z0-9]/g, '_')}.mobileprovision`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e: any) {
    useToast().add({ 
      title: 'Chyba', 
      description: e?.message || 'Nepodařilo se stáhnout profil', 
      color: 'red' 
    })
  }
}

async function checkUdidInProfile(moderatorId: string, platform: 'IOS' | 'TVOS') {
  const key = getProfileKey(moderatorId, platform)
  const udid = udidChecks.value[key]?.trim()
  if (!udid) return

  checkingUdid.value[key] = true
  udidResults.value[key] = { checked: false, found: false }

  try {
    const result = await $fetch<{ found: boolean; totalDevices: number; profileName: string | null }>(`/api/public/moderators/${moderatorId}/check-udid`, {
      method: 'POST',
      body: { udid, platform }
    })
    
    udidResults.value[key] = {
      checked: true,
      found: result.found,
      message: result.found 
        ? `UDID nalezeno v profilu (${result.totalDevices} zařízení celkem)` 
        : `UDID nebylo nalezeno v profilu (${result.totalDevices} zařízení celkem)`
    }
  } catch (e: any) {
    udidResults.value[key] = {
      checked: true,
      found: false,
      message: e?.data?.message || 'Nepodařilo se zkontrolovat UDID'
    }
  } finally {
    checkingUdid.value[key] = false
  }
}

function isUserRegisteredWith(moderatorId: string): boolean {
  if (!userRegistrations.value?.moderators) return false
  return userRegistrations.value.moderators.some((m: any) => m.moderatorId === moderatorId)
}
</script>
