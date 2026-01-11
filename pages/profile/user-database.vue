<template>
  <div class="space-y-6 max-w-7xl mx-auto px-4 pt-6">
    <!-- Connection Required Alert -->
    <UAlert
      v-if="!appleConnected"
      icon="i-heroicons-exclamation-triangle"
      color="yellow"
      variant="soft"
      title="Apple Developer Connection Recommended"
    >
      <template #description>
        <p class="mb-2">Connect your Apple Developer account to see which devices are already registered.</p>
        <UButton to="/profile/apple-developer" size="sm" color="yellow" variant="solid">
          Connect Now
        </UButton>
      </template>
    </UAlert>

    <!-- Header with Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="page-title">User Database</h1>
        <p class="text-sm text-slate-600 dark:text-white/60 mt-1">
          Manage your registered users and their devices for yearly device resets
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="appleConnected"
          to="/profile/user-import"
          color="blue"
          variant="soft"
          icon="i-heroicons-cloud-arrow-down"
        >
          Import from Apple
        </UButton>
        <UButton
          color="green"
          icon="i-heroicons-plus"
          @click="showAddUser = true"
        >
          Add User
        </UButton>
      </div>
    </div>

    <!-- Statistics Summary -->
    <div v-if="users.length > 0" class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UCard class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-slate-900 dark:text-white">{{ users.length }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Users</div>
        </div>
      </UCard>
      <UCard class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-500">{{ totalDevices }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Total Devices</div>
        </div>
      </UCard>
      <UCard class="glass border-2 border-emerald-500/30">
        <div class="text-center relative">
          <div class="text-3xl font-bold text-emerald-500">{{ paidUsersCount }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Paid for Next Year</div>
          
          <UButton
            v-if="paidUsersCount > 0"
            color="amber"
            variant="ghost"
            size="2xs"
            class="absolute -top-4 -right-4"
            icon="i-heroicons-arrow-path"
            @click="confirmResetAllPaid"
          >
            Reset
          </UButton>
        </div>
      </UCard>
      <UCard v-if="appleConnected" class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-500">{{ registeredInApple }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">In Apple</div>
        </div>
      </UCard>
      <UCard v-if="appleConnected" class="glass">
        <div class="text-center">
          <div class="text-3xl font-bold text-orange-500">{{ notRegisteredInApple }}</div>
          <div class="text-sm text-slate-600 dark:text-white/60">Not in Apple</div>
        </div>
      </UCard>
    </div>



    <!-- Bulk Import to Apple -->
    <UCard
      v-if="appleConnected && notRegisteredInApple > 0"
      class="glass border border-orange-500/40 text-sm"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-up-on-square-stack" class="text-lg text-orange-400" />
          <div class="space-y-0.5">
            <p class="font-medium text-slate-900 dark:text-white">
              {{ notRegisteredInApple }} device{{ notRegisteredInApple === 1 ? '' : 's' }} not registered in Apple
            </p>
            <p class="text-xs text-slate-600 dark:text-white/60">
              {{ paidCustomersWithUnimportedDevices }}
              paid customer{{ paidCustomersWithUnimportedDevices === 1 ? '' : 's' }}
              currently have device{{ paidCustomersWithUnimportedDevices === 1 ? '' : 's' }} waiting to be imported.
            </p>
          </div>
        </div>
        <UButton
          color="orange"
          size="sm"
          icon="i-heroicons-arrow-up-on-square"
          @click="openImportModal"
        >
          Import to Apple
        </UButton>
      </div>
      <p
        v-if="importAllResult"
        class="mt-2 text-xs"
        :class="importAllResult.success ? 'text-green-400' : 'text-red-400'"
      >
        {{ importAllResult.message }}
      </p>
    </UCard>

    <!-- Search and Filter -->
    <UCard class="glass">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <UInput
          v-model="search"
          placeholder="Search by name, notes, or UDID..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex rounded-lg bg-white/5 p-1 gap-1">
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap"
              :class="paymentFilter === 'all' 
                ? 'bg-white/15 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="paymentFilter = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap"
              :class="paymentFilter === 'paid' 
                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="paymentFilter = 'paid'"
            >
              <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
              Paid
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap"
              :class="paymentFilter === 'unpaid' 
                ? 'bg-orange-500/20 text-orange-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="paymentFilter = 'unpaid'"
            >
              <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" />
              Unpaid
            </button>
          </div>
          <div class="flex rounded-lg bg-white/5 p-1 gap-1">
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap"
              :class="discordFilter === 'all' 
                ? 'bg-white/15 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="discordFilter = 'all'"
            >
              All Discord
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap"
              :class="discordFilter === 'no-discord' 
                ? 'bg-red-500/20 text-red-400 shadow-sm' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
              @click="discordFilter = 'no-discord'"
            >
              <UIcon name="i-heroicons-user-minus" class="w-4 h-4" />
              No Discord ID
            </button>
          </div>
          <UButton
            icon="i-heroicons-arrow-path"
            color="gray"
            variant="ghost"
            :loading="refreshing"
            @click="refreshUsers"
          />
        </div>
      </div>
    </UCard>

    <!-- Users List -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-slate-400" />
    </div>

    <div v-else-if="filteredUsers.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-users" class="text-5xl text-slate-400 mb-4" />
      <p class="text-lg text-slate-600 dark:text-white/60">
        {{ search ? 'No users match your search' : 'No users yet' }}
      </p>
      <p v-if="!search" class="text-sm text-slate-500 dark:text-white/40 mt-2">
        Add users manually or import from your Apple Developer account
      </p>
    </div>

    <div v-else class="space-y-4">
      <UCard
        v-for="regUser in filteredUsers"
        :key="regUser.id"
        class="glass ring-0 ring-white/20"
      >
        <div class="space-y-4">
          <!-- User Header -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-2"
                :class="regUser.paidForNextYear 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 ring-emerald-400/50' 
                  : 'bg-gradient-to-br from-blue-500 to-purple-500 ring-white/20'"
              >
                <img
                  v-if="regUser.linkedUser?.discordAvatar || regUser.discordAvatar"
                  :src="regUser.linkedUser?.discordAvatar || regUser.discordAvatar || undefined"
                  :alt="regUser.linkedUser?.discordUsername || regUser.discordName"
                  class="w-full h-full object-cover"
                  @error="(e: any) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden') }"
                />
                <span 
                  :class="(regUser.linkedUser?.discordAvatar || regUser.discordAvatar) ? 'hidden' : ''"
                  class="text-white font-bold"
                >
                  {{ regUser.discordName.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-lg text-slate-900 dark:text-white">{{ regUser.discordName }}</h3>
                  <UBadge 
                    v-if="regUser.paidForNextYear" 
                    color="emerald" 
                    variant="soft" 
                    size="xs"
                    class="gap-1"
                  >
                    <UIcon name="i-heroicons-check-badge" class="w-3 h-3" />
                    Paid
                  </UBadge>
                  <UBadge
                    v-if="regUser.linkedUser && regUser.linkedUser.authProvider === 'discord'"
                    color="blue"
                    variant="soft"
                    size="xs"
                    class="gap-1"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Linked
                    <span v-if="regUser.linkedUser.discordUsername" class="hidden sm:inline">
                      • {{ regUser.linkedUser.discordUsername }}
                    </span>
                  </UBadge>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-white transition-colors"
                    title="Copy username"
                    @click="copyUsername(regUser.discordName)"
                  >
                    <UIcon 
                      :name="copiedDiscordUser === regUser.discordName ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'" 
                      class="w-4 h-4"
                      :class="{ 'text-green-400': copiedDiscordUser === regUser.discordName }"
                    />
                  </button>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-white/50">
                  <span>{{ regUser.deviceCount }} device{{ regUser.deviceCount === 1 ? '' : 's' }}</span>
                  <span v-if="regUser.registeredInAppleCount !== undefined">
                    • {{ regUser.registeredInAppleCount }}/{{ regUser.deviceCount }} in Apple
                  </span>
                  <span
                    v-if="regUser.discordId"
                    class="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 dark:text-white/50"
                  >
                    <UIcon name="i-heroicons-hashtag" class="w-3 h-3" />
                    <span class="font-mono">{{ regUser.discordId }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                v-if="regUser.discordId || regUser.linkedUser?.discordId"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all"
                title="Open Discord DM"
                @click="openDiscordDM(regUser)"
              >
                <UIcon name="i-heroicons-chat-bubble-left-right" class="w-4 h-4" />
                PM
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                :class="regUser.paidForNextYear 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'"
                :title="regUser.paidForNextYear ? 'Mark as unpaid' : 'Mark as paid for next year'"
                :disabled="togglingPaid === regUser.id"
                @click="togglePaidStatus(regUser)"
              >
                <UIcon 
                  :name="togglingPaid === regUser.id ? 'i-heroicons-arrow-path' : (regUser.paidForNextYear ? 'i-heroicons-check-badge' : 'i-heroicons-currency-dollar')" 
                  :class="{ 'animate-spin': togglingPaid === regUser.id }"
                  class="w-4 h-4" 
                />
                {{ regUser.paidForNextYear ? 'Paid' : 'Mark Paid' }}
              </button>
              <button
                v-if="appleConnected && regUser.devices.some(d => !d.isRegisteredInApple)"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all"
                :disabled="importingUser === regUser.id"
                @click="handleImportUser(regUser)"
              >
                <UIcon 
                  :name="importingUser === regUser.id ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-up-on-square'" 
                  :class="{ 'animate-spin': importingUser === regUser.id }"
                  class="w-4 h-4" 
                />
                Import
              </button>
              <button
                type="button"
                class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                @click="editUser(regUser)"
              >
                <UIcon name="i-heroicons-pencil" class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                @click="confirmDeleteUser(regUser)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Notes -->
          <p v-if="regUser.notes" class="text-sm text-slate-600 dark:text-white/60 italic">
            {{ regUser.notes }}
          </p>

          <!-- Devices List -->
          <div v-if="regUser.devices.length > 0" class="space-y-2">
            <div
              v-for="device in regUser.devices"
              :key="device.id"
              class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <UIcon :name="getDeviceIcon(device.platform)" class="text-lg text-slate-400" />
                <div class="min-w-0">
                  <p class="font-medium truncate text-slate-900 dark:text-white">{{ device.name }}</p>
                  <p class="font-mono text-xs text-slate-500 dark:text-white/40 truncate">{{ device.udid }}</p>
                  <p v-if="device.needsSync && !syncSuccess && !syncError" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠ Apple has: "{{ device.appleDeviceName }}"
                  </p>
                  <p v-if="syncSuccess === device.id" class="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Synced to Apple Developer Portal
                  </p>
                  <p v-if="syncError === device.id" class="text-xs text-red-600 dark:text-red-400 mt-1">
                    ✗ Sync failed - please try again
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <UBadge
                  v-if="device.isRegisteredInApple !== undefined"
                  :color="device.isRegisteredInApple ? 'green' : 'orange'"
                  variant="soft"
                  size="xs"
                >
                  {{ device.isRegisteredInApple ? 'In Apple' : 'Not in Apple' }}
                </UBadge>
                <UBadge color="blue" variant="soft" size="xs">{{ device.platform }}</UBadge>
                <button
                  v-if="device.needsSync"
                  type="button"
                  class="p-1.5 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
                  :disabled="syncingDevice === device.id"
                  @click="syncDeviceToApple(regUser, device)"
                  :title="`Update name in Apple: '${device.appleDeviceName}' → '${device.name}'`"
                >
                  <UIcon v-if="syncingDevice === device.id" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
                  <UIcon v-else name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  @click="editDevice(regUser, device)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  @click="confirmDeleteDevice(regUser, device)"
                >
                  <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Add Device Button -->
          <UButton
            color="green"
            variant="soft"
            size="sm"
            icon="i-heroicons-plus"
            block
            @click="addDeviceToUser(regUser)"
          >
            Add Device
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Add/Edit User Modal -->
    <UModal v-model="showAddUser">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="editingUser ? 'i-heroicons-pencil' : 'i-heroicons-user-plus'" />
            <span class="font-semibold">{{ editingUser ? 'Edit User' : 'Add User' }}</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSaveUser">
          <!-- Discord User Matching (Primary Method) -->
          <div class="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-identification" class="text-blue-600 dark:text-blue-400" />
              <span class="font-semibold text-blue-900 dark:text-blue-100">Discord User Matching (Recommended)</span>
            </div>
            
            <UFormGroup label="Discord User ID" help="Enter Discord user ID (18-19 digit number)">
              <div class="flex gap-2">
                <UInput
                  v-model="userFormDiscordId"
                  placeholder="e.g. 123456789012345678"
                  class="flex-1"
                  :disabled="userFormDiscordLoading"
                  @input="fetchDiscordUserDetails"
                  @keyup.enter="fetchDiscordUserDetails"
                />
                <UButton
                  color="blue"
                  variant="soft"
                  icon="i-heroicons-magnifying-glass"
                  :loading="userFormDiscordLoading"
                  @click="fetchDiscordUserDetails"
                  title="Fetch Discord user"
                >
                  Fetch
                </UButton>
              </div>
            </UFormGroup>

            <!-- Loading Indicator -->
            <div v-if="userFormDiscordLoading" class="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              <span>Fetching Discord user information...</span>
            </div>

            <!-- Discord User Details -->
            <div v-if="userFormDiscordDetails" class="p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-500">
                  <img
                    v-if="userFormDiscordDetails.avatar"
                    :src="userFormDiscordDetails.avatar"
                    :alt="userFormDiscordDetails.username"
                    class="w-full h-full object-cover"
                    @error="(e: any) => { e.target.style.display = 'none'; e.target.nextElementSibling?.classList.remove('hidden') }"
                  />
                  <div 
                    :class="userFormDiscordDetails.avatar ? 'hidden' : ''"
                    class="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                  >
                    {{ userFormDiscordDetails.username.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-slate-900 dark:text-white truncate">{{ userFormDiscordDetails.username }}</div>
                  <div class="text-sm text-slate-600 dark:text-white/60">
                    <span class="font-mono">{{ userFormDiscordDetails.id }}</span>
                    <span v-if="userFormDiscordDetails.globalName" class="ml-2">
                      • {{ userFormDiscordDetails.globalName }}
                    </span>
                  </div>
                </div>
                <UBadge color="green" variant="soft" size="sm">Verified</UBadge>
              </div>
            </div>

            <UAlert
              v-if="userFormDiscordError"
              icon="i-heroicons-exclamation-circle"
              color="red"
              variant="soft"
              :title="userFormDiscordError"
            />

            <UButton
              v-if="userFormDiscordDetails"
              color="gray"
              variant="soft"
              size="sm"
              :icon="userForm.useCustomName ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              @click="userForm.useCustomName = !userForm.useCustomName"
            >
              {{ userForm.useCustomName ? 'Hide' : 'Use Custom Discord Name' }}
            </UButton>

            <!-- Custom Discord Name (Only shown when toggled) -->
            <div v-if="userForm.useCustomName && userFormDiscordDetails" class="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <UFormGroup label="Custom Discord Name" help="Override the Discord username with a custom name">
                <UInput
                  v-model="userForm.discordName"
                  placeholder="Enter custom Discord name"
                />
              </UFormGroup>
              <UButton
                v-if="editingUser && editingUser.discordId"
                color="red"
                variant="soft"
                size="xs"
                class="mt-2"
                @click="clearCustomName"
              >
                Remove Custom Name
              </UButton>
            </div>
          </div>

          <!-- Custom Discord Name (When no Discord ID provided) -->
          <div v-if="!userFormDiscordId" class="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user" class="text-slate-600 dark:text-slate-400" />
              <span class="font-semibold text-slate-900 dark:text-slate-100">Custom Discord Name (Alternative)</span>
            </div>

            <UFormGroup label="Discord Name">
              <UInput
                v-model="userForm.discordName"
                placeholder="john_doe or John#1234"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Notes">
            <UTextarea v-model="userForm.notes" placeholder="Optional notes about this user..." :rows="3" />
          </UFormGroup>
          <p v-if="userFormError" class="text-sm text-red-400">{{ userFormError }}</p>

          <!-- Merge Section (only when editing) -->
          <div v-if="editingUser && mergeableUsers.length > 0" class="pt-4 border-t border-white/10">
            <p class="text-sm font-medium text-slate-700 dark:text-white/80 mb-3">Merge with another user</p>
            <div class="space-y-3">
              <UFormGroup label="Select user to merge into">
                <USelectMenu
                  v-model="mergeTargetId"
                  :options="mergeableUserOptions"
                  placeholder="Select a user..."
                  value-attribute="value"
                  option-attribute="label"
                  :searchable="true"
                  searchable-placeholder="Search users..."
                />
              </UFormGroup>
              <UAlert
                v-if="mergeTargetId"
                icon="i-heroicons-exclamation-triangle"
                color="orange"
                variant="soft"
                title="Warning"
              >
                <template #description>
                  <p class="text-sm">
                    This will move all {{ editingUser.deviceCount }} device(s) to 
                    <strong>{{ mergeableUsers.find(u => u.id === mergeTargetId)?.discordName }}</strong> 
                    and delete <strong>{{ editingUser.discordName }}</strong>.
                  </p>
                </template>
              </UAlert>
              <UButton
                v-if="mergeTargetId"
                color="orange"
                variant="soft"
                :loading="merging"
                icon="i-heroicons-arrow-right-circle"
                @click="handleMergeUser"
              >
                Merge Users
              </UButton>
              <p v-if="mergeError" class="text-sm text-red-400">{{ mergeError }}</p>
              <p v-if="mergeSuccess" class="text-sm text-green-400">{{ mergeSuccess }}</p>
            </div>
          </div>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showAddUser = false">Cancel</UButton>
            <UButton color="green" :loading="savingUser" @click="handleSaveUser">
              {{ editingUser ? 'Save Changes' : 'Add User' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Add/Edit Device Modal -->
    <UModal v-model="showAddDevice">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon :name="editingDevice ? 'i-heroicons-pencil' : 'i-heroicons-device-phone-mobile'" />
            <span class="font-semibold">{{ editingDevice ? 'Edit Device' : 'Add Device' }}</span>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSaveDevice">
          <div class="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p class="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> Device names are automatically generated in the format: 
              <span class="font-mono">[Discord name] - [Device type] [number]</span>
            </p>
          </div>
          <UFormGroup label="UDID" required>
            <div class="flex gap-2">
              <UInput 
                v-model="deviceForm.udid" 
                placeholder="00000000-000000000000000" 
                class="font-mono flex-1" 
              />
              <UButton
                color="blue"
                variant="soft"
                icon="i-heroicons-magnifying-glass"
                :loading="detectingDevice"
                @click="detectDeviceType"
                title="Auto-detect device type from Apple"
              >
                Detect
              </UButton>
            </div>
            <p v-if="deviceDetected" class="text-xs text-green-600 dark:text-green-400 mt-1">
              ✓ Device type detected from Apple Developer Portal
            </p>
          </UFormGroup>
          <UFormGroup label="Platform">
            <USelect v-model="deviceForm.platform" :options="platformOptions" />
          </UFormGroup>
          <p v-if="deviceFormError" class="text-sm text-red-400">{{ deviceFormError }}</p>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showAddDevice = false">Cancel</UButton>
            <UButton color="green" :loading="savingDevice" @click="handleSaveDevice">
              {{ editingDevice ? 'Save Changes' : 'Add Device' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteConfirm">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2 text-red-400">
            <UIcon name="i-heroicons-exclamation-triangle" />
            <span class="font-semibold">Confirm Delete</span>
          </div>
        </template>

        <p class="text-slate-600 dark:text-white/70">{{ deleteConfirmMessage }}</p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showDeleteConfirm = false">Cancel</UButton>
            <UButton color="red" :loading="deleting" @click="handleDelete">Delete</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Reset All Paid Confirmation Modal -->
    <UModal v-model="showResetPaidConfirm">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2 text-amber-400">
            <UIcon name="i-heroicons-arrow-path" />
            <span class="font-semibold">Reset All Paid Status</span>
          </div>
        </template>

        <div class="space-y-3">
          <p class="text-slate-600 dark:text-white/70">
            Are you sure you want to reset the paid status for all <strong>{{ paidUsersCount }}</strong> user{{ paidUsersCount === 1 ? '' : 's' }}?
          </p>
          <p class="text-sm text-slate-500 dark:text-white/50">
            This is typically done when starting a new yearly cycle. All users will be marked as unpaid.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="showResetPaidConfirm = false">Cancel</UButton>
            <UButton color="amber" :loading="resettingAllPaid" @click="handleResetAllPaid">Reset All</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Import Overview Modal -->
    <UModal v-model="showImportModal" size="xl">
      <UCard class="glass">
        <template #header>
          <div class="flex items-center gap-2 text-orange-400">
            <UIcon name="i-heroicons-cloud-arrow-up" />
            <span class="font-semibold">Import Devices to Apple</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between bg-white/5 p-3 rounded-lg">
            <div class="flex items-center gap-2">
              <UToggle v-model="importOptions.onlyPaid" />
              <div class="flex flex-col">
                <span class="text-sm font-medium text-slate-900 dark:text-white">Only Paid Users</span>
                <span class="text-xs text-slate-500 dark:text-white/50">Only import devices from users marked as paid</span>
              </div>
            </div>
          </div>

          <div v-if="isLoadingPreview" class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-orange-400 mb-2" />
            <p class="text-slate-500 font-medium">Checking with Apple...</p>
          </div>

          <div v-else-if="previewData" class="space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-slate-600 dark:text-white/70">
                Found <strong>{{ previewData.totalToImport }}</strong> device(s) to import.
              </p>
              <UBadge :color="previewData.totalToImport > 0 ? 'orange' : 'gray'" variant="soft">
                {{ previewData.totalToImport }} New
              </UBadge>
            </div>

            <!-- Preview List -->
            <div v-if="previewData.devices.length > 0" class="border border-white/10 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table class="min-w-full divide-y divide-white/10">
                <thead class="bg-white/5">
                  <tr>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Device</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/10 bg-transparent">
                  <tr v-for="device in previewData.devices" :key="device.id">
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-white">{{ device.name }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs font-mono text-slate-500">{{ device.udid }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-slate-500">{{ device.discordName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p v-else class="text-center py-4 text-slate-500 italic">
              All devices matching criteria are already in Apple!
            </p>

            <UAlert
              v-if="importOptions.onlyPaid && hiddenByFilterCount > 0 && previewData.totalToImport === 0"
              icon="i-heroicons-information-circle"
              color="blue"
              variant="soft"
              :title="`${hiddenByFilterCount} device(s) are hidden by the 'Paid Only' filter.`"
            >
              <template #description>
                <p class="text-xs mt-1">
                  Disable the filter above to see devices belonging to unpaid users.
                </p>
              </template>
            </UAlert>

            <UAlert
              v-if="importError"
              icon="i-heroicons-exclamation-circle"
              color="red"
              variant="soft"
              :title="importError"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center w-full">
             <div class="text-xs text-slate-500">
                {{ importingAll ? 'Importing...' : 'Ready to import' }}
             </div>
             <div class="flex gap-2">
                <UButton color="gray" variant="ghost" @click="showImportModal = false" :disabled="importingAll">Cancel</UButton>
                <UButton 
                  v-if="previewData && previewData.totalToImport > 0"
                  color="orange" 
                  :loading="importingAll" 
                  @click="confirmImport"
                >
                  Confirm Import
                </UButton>
             </div>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: 'User Database', layout: 'default' })

interface Device {
  id: string
  udid: string
  name: string
  deviceNumber: number
  platform: string
  createdAt: string
  updatedAt: string
  isRegisteredInApple?: boolean
  appleDeviceId?: string
  appleDeviceName?: string
  needsSync?: boolean
}

interface RegisteredUser {
  id: string
  discordName: string
  discordId?: string | null
  discordAvatar?: string | null // Avatar URL fetched from Discord API
  notes: string | null
  paidForNextYear: boolean
  devices: Device[]
  deviceCount: number
  registeredInAppleCount?: number
  createdAt: string
  updatedAt: string
  linkedUser?: {
    id: string
    nickname: string
    authProvider: string
    discordId?: string | null
    discordUsername?: string | null
    discordAvatar?: string | null
  } | null
}

const search = ref('')
const refreshing = ref(false)
const paymentFilter = ref<'all' | 'paid' | 'unpaid'>('all')
const discordFilter = ref<'all' | 'no-discord'>('all')

// Apple connection status
const { data: appleStatus } = await useFetch('/api/apple/credentials')
const appleConnected = computed(() => appleStatus.value?.connected ?? false)

// Fetch users with Apple status if connected
const { data: usersData, pending: loading, refresh: refreshUsersData } = await useFetch<RegisteredUser[]>('/api/registered-users', {
  query: computed(() => ({ includeAppleStatus: appleConnected.value })),
  default: () => []
})

const users = computed(() => usersData.value || [])

const filteredUsers = computed(() => {
  let result = users.value
  
  // Apply payment filter
  if (paymentFilter.value === 'paid') {
    result = result.filter(u => u.paidForNextYear)
  } else if (paymentFilter.value === 'unpaid') {
    result = result.filter(u => !u.paidForNextYear)
  }
  
  // Apply Discord filter
  if (discordFilter.value === 'no-discord') {
    result = result.filter(u => !u.discordId)
  }
  
  // Apply search filter
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(u =>
      u.discordName.toLowerCase().includes(s) ||
      u.notes?.toLowerCase().includes(s) ||
      u.devices.some(d => d.name.toLowerCase().includes(s) || d.udid.toLowerCase().includes(s))
    )
  }
  
  return result
})

// Statistics
const totalDevices = computed(() => users.value.reduce((sum, u) => sum + u.deviceCount, 0))
const registeredInApple = computed(() => users.value.reduce((sum, u) => sum + (u.registeredInAppleCount || 0), 0))
const notRegisteredInApple = computed(() => totalDevices.value - registeredInApple.value)
const paidUsersCount = computed(() => users.value.filter(u => u.paidForNextYear).length)
const paidCustomersWithUnimportedDevices = computed(() =>
  users.value.filter(
    u => u.paidForNextYear && u.devices.some(d => !d.isRegisteredInApple)
  ).length
)

const hiddenByFilterCount = computed(() => {
  return users.value
    .filter(u => !u.paidForNextYear)
    .reduce((sum, u) => sum + u.devices.filter(d => !d.isRegisteredInApple).length, 0)
})

// Platform options
const platformOptions = [
  { label: 'iOS', value: 'IOS' },
  { label: 'macOS', value: 'MAC_OS' },
  { label: 'Apple TV', value: 'APPLE_TV' }
]

// User form state
const showAddUser = ref(false)
const editingUser = ref<RegisteredUser | null>(null)
const userForm = reactive({
  discordName: '',
  notes: '',
  useCustomName: false
})
const userFormError = ref('')
const savingUser = ref(false)

// Discord ID for user form
const userFormDiscordId = ref('')
const userFormDiscordLoading = ref(false)
const userFormDiscordDetails = ref<{
  id: string
  username: string
  avatar: string | null
  globalName?: string | null
} | null>(null)
const userFormDiscordError = ref<string | null>(null)

function clearCustomName() {
  userForm.useCustomName = false
  if (userFormDiscordDetails.value) {
    userForm.discordName = userFormDiscordDetails.value.username
  }
}

// Merge state
const mergeTargetId = ref<string | undefined>(undefined)
const merging = ref(false)
const mergeError = ref('')
const mergeSuccess = ref('')

// Users that can be merged into (all except the one being edited)
const mergeableUsers = computed(() => {
  if (!editingUser.value) return []
  return users.value.filter(u => u.id !== editingUser.value!.id)
})

const mergeableUserOptions = computed(() => {
  return mergeableUsers.value.map(u => ({
    value: u.id,
    label: `${u.discordName} (${u.deviceCount} devices)`
  }))
})

// Device form state
const showAddDevice = ref(false)
const editingDevice = ref<Device | null>(null)
const deviceForUser = ref<RegisteredUser | null>(null)
const deviceForm = reactive({
  name: '',
  udid: '',
  platform: 'IOS'
})
const deviceFormError = ref('')
const savingDevice = ref(false)
const detectingDevice = ref(false)
const deviceDetected = ref(false)

// Device sync state
const syncingDevice = ref<string | null>(null)
const syncSuccess = ref<string | null>(null)
const syncError = ref<string | null>(null)

// Delete state
const showDeleteConfirm = ref(false)
const deleteConfirmMessage = ref('')
const deleteTarget = ref<{ type: 'user' | 'device'; userId: string; deviceId?: string } | null>(null)
const deleting = ref(false)

// Import state
const importingUser = ref<string | null>(null)
const importingAll = ref(false)
const importAllResult = ref<{ success: boolean; message: string } | null>(null)

// Advanced Import State
const showImportModal = ref(false)
const importOptions = reactive({
  onlyPaid: true
})
const isLoadingPreview = ref(false)
const previewData = ref<{
  totalToImport: number;
  devices: Array<{
    id: string;
    udid: string;
    name: string;
    platform: string;
    discordName: string;
  }>
} | null>(null)
const importError = ref('')

// Paid status toggle state
const togglingPaid = ref<string | null>(null)
const resettingAllPaid = ref(false)
const showResetPaidConfirm = ref(false)

function getDeviceIcon(platform: string) {
  if (platform === 'MAC_OS') return 'i-heroicons-computer-desktop'
  if (platform === 'APPLE_TV') return 'i-heroicons-tv'
  return 'i-heroicons-device-phone-mobile'
}

// Discord copy + open state
const copiedDiscordUser = ref<string | null>(null)

async function copyUsername(discordName: string) {
  try {
    await navigator.clipboard.writeText(discordName)
    copiedDiscordUser.value = discordName
    setTimeout(() => {
      copiedDiscordUser.value = null
    }, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function openDiscordDM(regUser: RegisteredUser) {
  const discordId = regUser.linkedUser?.discordId || regUser.discordId
  if (!discordId) return
  const url = `https://discord.com/users/${discordId}`
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

async function refreshUsers() {
  refreshing.value = true
  await refreshUsersData()
  refreshing.value = false
}

// Toggle paid status
async function togglePaidStatus(regUser: RegisteredUser) {
  togglingPaid.value = regUser.id
  try {
    await $fetch(`/api/registered-users/${regUser.id}`, {
      method: 'PATCH',
      body: {
        paidForNextYear: !regUser.paidForNextYear
      }
    })
    await refreshUsers()
  } catch (e: any) {
    console.error('Failed to toggle paid status:', e)
  } finally {
    togglingPaid.value = null
  }
}

// Reset all paid statuses
function confirmResetAllPaid() {
  showResetPaidConfirm.value = true
}

async function handleResetAllPaid() {
  resettingAllPaid.value = true
  try {
    // Reset all paid users
    const paidUsers = users.value.filter(u => u.paidForNextYear)
    await Promise.all(
      paidUsers.map(u =>
        $fetch(`/api/registered-users/${u.id}`, {
          method: 'PATCH',
          body: { paidForNextYear: false }
        })
      )
    )
    showResetPaidConfirm.value = false
    await refreshUsers()
  } catch (e: any) {
    console.error('Failed to reset paid statuses:', e)
  } finally {
    resettingAllPaid.value = false
  }
}

// Fetch Discord user details by ID
async function fetchDiscordUserDetails() {
  const discordId = userFormDiscordId.value.trim()
  userFormDiscordDetails.value = null
  userFormDiscordError.value = null

  // Validate Discord ID format (18-19 digits)
  if (!discordId) {
    return
  }

  if (!/^\d{17,19}$/.test(discordId)) {
    userFormDiscordError.value = 'Invalid Discord ID format (must be 18-19 digits)'
    return
  }

  userFormDiscordLoading.value = true
  try {
    console.log('Fetching Discord user details for ID:', discordId)
    const details = await $fetch<{
      id: string
      username: string
      avatar: string | null
      globalName?: string | null
    }>(`/api/admin/discord-users/${discordId}`)

    console.log('Discord user details fetched:', details)
    userFormDiscordDetails.value = details
    
    // Always auto-fill Discord name from verified Discord user
    // User can override with custom name checkbox if needed
    userForm.discordName = details.username
  } catch (e: any) {
    console.error('Error fetching Discord user:', e)
    const errorMessage = e?.data?.message || e?.message || 'Failed to fetch Discord user'
    userFormDiscordError.value = errorMessage
    userFormDiscordDetails.value = null
  } finally {
    userFormDiscordLoading.value = false
  }
}

// Watch for custom name checkbox - restore Discord username when unchecked
watch(() => userForm.useCustomName, (useCustom) => {
  if (!useCustom && userFormDiscordDetails.value) {
    // Restore Discord username when custom name is unchecked
    userForm.discordName = userFormDiscordDetails.value.username
  }
})

// User CRUD
async function editUser(user: RegisteredUser) {
  editingUser.value = user
  userForm.notes = user.notes || ''
  userFormError.value = ''
  // Reset Discord ID
  userFormDiscordId.value = user.discordId || ''
  userFormDiscordDetails.value = null
  userFormDiscordError.value = null
  userForm.useCustomName = false
  
  if (user.discordId) {
    // Fetch Discord details first, then set the name
    await fetchDiscordUserDetails()
    // After fetching, check if the stored name matches the Discord username
    // If it doesn't match, user is using a custom name
    const details = userFormDiscordDetails.value
    if (details && typeof details === 'object' && 'username' in details) {
      const typedDetails = details as { id: string; username: string; avatar: string | null; globalName?: string | null }
      if (user.discordName !== typedDetails.username) {
        userForm.useCustomName = true
        userForm.discordName = user.discordName
      } else {
        userForm.discordName = typedDetails.username
      }
    } else {
      userForm.discordName = user.discordName
    }
  } else {
    userForm.discordName = user.discordName
  }
  
  // Reset merge state
  mergeTargetId.value = undefined
  mergeError.value = ''
  mergeSuccess.value = ''
  showAddUser.value = true
}

async function handleMergeUser() {
  if (!editingUser.value || !mergeTargetId.value) return

  merging.value = true
  mergeError.value = ''
  mergeSuccess.value = ''

  try {
    const result = await $fetch<{ devicesMoved: number; devicesSkipped: number; targetUser: { discordName: string } }>(`/api/registered-users/${editingUser.value.id}/merge`, {
      method: 'POST',
      body: {
        targetUserId: mergeTargetId.value
      }
    })

    mergeSuccess.value = `Merged! ${result.devicesMoved} device(s) moved to ${result.targetUser.discordName}.${result.devicesSkipped > 0 ? ` ${result.devicesSkipped} duplicate(s) skipped.` : ''}`
    
    // Close modal and refresh after short delay
    setTimeout(async () => {
      showAddUser.value = false
      editingUser.value = null
      mergeTargetId.value = undefined
      await refreshUsers()
    }, 1500)
  } catch (e: any) {
    mergeError.value = e?.data?.message || 'Failed to merge users'
  } finally {
    merging.value = false
  }
}

async function handleSaveUser() {
  // Validate: either Discord ID provided OR custom Discord name provided
  const discordId = userFormDiscordId.value.trim()
  if (!discordId && !userForm.discordName.trim()) {
    userFormError.value = 'Either provide a Discord ID or a custom Discord name'
    return
  }

  // If Discord ID is provided, validate format
  if (discordId && !/^\d{17,19}$/.test(discordId)) {
    userFormError.value = 'Invalid Discord ID format (must be 18-19 digits)'
    return
  }

  savingUser.value = true
  userFormError.value = ''

  try {
    const body: any = {
      notes: userForm.notes.trim() || null
    }

    if (discordId) {
      // Use Discord matching - always send Discord ID
      // Backend will fetch Discord username unless useCustomName is true
      body.discordId = discordId
      // Always send useCustomName so backend knows whether to fetch from Discord or use custom name
      body.useCustomName = userForm.useCustomName
      // Only send custom name if explicitly using custom name and it's provided
      if (userForm.useCustomName && userForm.discordName.trim()) {
        body.discordName = userForm.discordName.trim()
      }
      // If not using custom name, backend will fetch and use Discord username automatically
    } else if (editingUser.value?.discordId) {
      // When editing with existing Discord ID but form field is empty, send the existing ID
      // This happens when user wants to keep the Discord ID but we need to send it for backend processing
      body.discordId = editingUser.value.discordId
      body.useCustomName = userForm.useCustomName
      if (userForm.useCustomName && userForm.discordName.trim()) {
        body.discordName = userForm.discordName.trim()
      }
    } else {
      // Use custom Discord name (no Discord ID provided)
      body.discordName = userForm.discordName.trim()
    }

    if (editingUser.value) {
      await $fetch(`/api/registered-users/${editingUser.value.id}`, {
        method: 'PATCH',
        body
      })
    } else {
      await $fetch('/api/registered-users', {
        method: 'POST',
        body
      })
    }
    showAddUser.value = false
    editingUser.value = null
    userForm.discordName = ''
    userForm.notes = ''
    userForm.useCustomName = false
    userFormDiscordId.value = ''
    userFormDiscordDetails.value = null
    userFormDiscordError.value = null
    await refreshUsers()
  } catch (e: any) {
    userFormError.value = e?.data?.message || 'Failed to save user'
  } finally {
    savingUser.value = false
  }
}

function confirmDeleteUser(user: RegisteredUser) {
  deleteTarget.value = { type: 'user', userId: user.id }
  deleteConfirmMessage.value = `Are you sure you want to delete "${user.discordName}" and all their ${user.deviceCount} device(s)?`
  showDeleteConfirm.value = true
}

// Device CRUD
function addDeviceToUser(user: RegisteredUser) {
  deviceForUser.value = user
  editingDevice.value = null
  deviceForm.name = ''
  deviceForm.udid = ''
  deviceForm.platform = 'IOS'
  deviceFormError.value = ''
  detectingDevice.value = false
  deviceDetected.value = false
  showAddDevice.value = true
}

// Auto-detect device type from Apple Developer Portal
async function detectDeviceType() {
  if (!deviceForm.udid.trim()) {
    deviceFormError.value = 'Please enter a UDID first'
    return
  }

  detectingDevice.value = true
  deviceFormError.value = ''
  deviceDetected.value = false

  try {
    const result = await $fetch<{
      found: boolean
      platform?: string
      deviceClass?: string
      message?: string
    }>(`/api/apple/detect-device?udid=${encodeURIComponent(deviceForm.udid.trim())}`)

    if (result.found && result.platform) {
      deviceForm.platform = result.platform
      deviceDetected.value = true
      // Clear detected status after 3 seconds
      setTimeout(() => {
        deviceDetected.value = false
      }, 3000)
    } else {
      deviceFormError.value = result.message || 'Device not found in Apple Developer account'
    }
  } catch (e: any) {
    deviceFormError.value = e?.data?.message || 'Failed to detect device type'
  } finally {
    detectingDevice.value = false
  }
}

function editDevice(user: RegisteredUser, device: Device) {
  deviceForUser.value = user
  editingDevice.value = device
  deviceForm.udid = device.udid
  deviceForm.platform = device.platform
  deviceFormError.value = ''
  detectingDevice.value = false
  deviceDetected.value = false
  showAddDevice.value = true
}

async function handleSaveDevice() {
  if (!deviceForm.udid.trim()) {
    deviceFormError.value = 'UDID is required'
    return
  }

  if (!deviceForUser.value) return

  savingDevice.value = true
  deviceFormError.value = ''

  try {
    if (editingDevice.value) {
      await $fetch(`/api/registered-users/${deviceForUser.value.id}/devices/${editingDevice.value.id}`, {
        method: 'PATCH',
        body: {
          udid: deviceForm.udid.trim(),
          platform: deviceForm.platform
        }
      })
    } else {
      await $fetch(`/api/registered-users/${deviceForUser.value.id}/devices`, {
        method: 'POST',
        body: {
          udid: deviceForm.udid.trim(),
          platform: deviceForm.platform
        }
      })
    }
    showAddDevice.value = false
    editingDevice.value = null
    deviceForUser.value = null
    await refreshUsers()
  } catch (e: any) {
    deviceFormError.value = e?.data?.message || 'Failed to save device'
  } finally {
    savingDevice.value = false
  }
}

function confirmDeleteDevice(user: RegisteredUser, device: Device) {
  deleteTarget.value = { type: 'device', userId: user.id, deviceId: device.id }
  deleteConfirmMessage.value = `Are you sure you want to delete device "${device.name}" (${device.udid})?`
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    if (deleteTarget.value.type === 'user') {
      await $fetch(`/api/registered-users/${deleteTarget.value.userId}`, { method: 'DELETE' })
    } else if (deleteTarget.value.deviceId) {
      await $fetch(`/api/registered-users/${deleteTarget.value.userId}/devices/${deleteTarget.value.deviceId}`, { method: 'DELETE' })
    }
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await refreshUsers()
  } catch (e: any) {
    console.error('Delete failed:', e)
  } finally {
    deleting.value = false
  }
}

// Sync device name to Apple Developer Portal
async function syncDeviceToApple(user: RegisteredUser, device: Device) {
  syncingDevice.value = device.id
  syncSuccess.value = null
  syncError.value = null

  try {
    const result = await $fetch<{ 
      success: boolean
      deviceName: string
      platform: string
      deviceClass: string
    }>(`/api/registered-users/${user.id}/devices/${device.id}/sync-to-apple`, {
      method: 'POST'
    })
    
    if (result.success) {
      // Update the device locally without refreshing the entire list
      const userIndex = users.value.findIndex(u => u.id === user.id)
      if (userIndex !== -1) {
        const deviceIndex = users.value[userIndex].devices.findIndex(d => d.id === device.id)
        if (deviceIndex !== -1) {
          // Update the device properties
          users.value[userIndex].devices[deviceIndex].name = result.deviceName
          users.value[userIndex].devices[deviceIndex].platform = result.platform
          users.value[userIndex].devices[deviceIndex].needsSync = false
          users.value[userIndex].devices[deviceIndex].appleDeviceName = result.deviceName
        }
      }
      
      syncSuccess.value = device.id
      // Clear success message after 3 seconds
      setTimeout(() => {
        if (syncSuccess.value === device.id) {
          syncSuccess.value = null
        }
      }, 3000)
    }
  } catch (e: any) {
    syncError.value = device.id
    console.error('Sync failed:', e)
    // Clear error message after 5 seconds
    setTimeout(() => {
      if (syncError.value === device.id) {
        syncError.value = null
      }
    }, 5000)
  } finally {
    syncingDevice.value = null
  }
}

// Import to Apple
async function handleImportUser(user: RegisteredUser) {
  importingUser.value = user.id
  try {
    const result = await $fetch<{ registered: number; alreadyRegistered: number; failed: any[] }>(`/api/registered-users/${user.id}/import-to-apple`, {
      method: 'POST'
    })
    await refreshUsers()
    if (result.registered > 0) {
      // Show success somehow - could use a toast
    }
  } catch (e: any) {
    console.error('Import failed:', e)
  } finally {
    importingUser.value = null
  }
}

async function openImportModal() {
  showImportModal.value = true
  importOptions.onlyPaid = true // Reset to default
  importError.value = ''
  await fetchPreview()
}

async function fetchPreview() {
  isLoadingPreview.value = true
  previewData.value = null
  importError.value = ''
  
  try {
    const result = await $fetch<any>('/api/registered-users/import-to-apple', {
      method: 'POST',
      body: { 
        all: true,
        onlyPaid: importOptions.onlyPaid,
        dryRun: true
      }
    })
    
    previewData.value = {
      totalToImport: result.totalToImport,
      devices: result.devices
    }
  } catch (e: any) {
    importError.value = e?.data?.message || 'Failed to fetch preview'
  } finally {
    isLoadingPreview.value = false
  }
}

// Watch option changes to re-fetch preview
watch(() => importOptions.onlyPaid, () => {
  if (showImportModal.value) {
    fetchPreview()
  }
})

async function confirmImport() {
  importingAll.value = true
  importAllResult.value = null
  importError.value = ''
  
  try {
    // We can just call with dryRun: false and same params
    const result = await $fetch<{ registered: number; alreadyRegistered: number; failed: any[] }>('/api/registered-users/import-to-apple', {
      method: 'POST',
      body: { 
        all: true, 
        onlyPaid: importOptions.onlyPaid
      }
    })
    
    // Clear preview data to prevent UI glitches/reactivity errors during close
    previewData.value = null
    showImportModal.value = false
    await refreshUsers()
    
    const failedCount = result.failed.length
    let msg = `Successfully registered ${result.registered} device(s) to Apple. ${result.alreadyRegistered} were already registered.`
    
    if (failedCount > 0) {
      msg += ` ${failedCount} device(s) failed to register.`
      console.warn('Failed devices:', result.failed)
      // If all failed, mark as error for visibility
      if (result.registered === 0) {
        importAllResult.value = {
          success: false,
          message: msg + ' Check console for details.'
        }
        return
      }
    }

    importAllResult.value = {
      success: true,
      message: msg
    }
  } catch (e: any) {
    importError.value = e?.data?.message || 'Failed to import devices'
    // Keep modal open on error to show it
  } finally {
    importingAll.value = false
  }
}

// Old simpler handler - kept but replaced in usage
async function handleImportAll() {
  // Redirect to new flow
  openImportModal()
}

// Reset user modal when closed
watch(showAddUser, (val) => {
  if (!val) {
    editingUser.value = null
    userForm.discordName = ''
    userForm.notes = ''
    userForm.useCustomName = false
    userFormError.value = ''
    userFormDiscordId.value = ''
    userFormDiscordDetails.value = null
    userFormDiscordError.value = null
    // Reset merge state
    mergeTargetId.value = undefined
    mergeError.value = ''
    mergeSuccess.value = ''
  }
})
</script>

