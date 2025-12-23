export interface AuthUser {
  id: string
  nickname: string
  email?: string
  role: string
  authProvider?: string
  discordId?: string
  discordUsername?: string
  discordAvatar?: string
}

// Store refresh function globally for use after login/logout
let refreshFn: (() => Promise<void>) | null = null

export const useAuth = () => {
  // Get request headers for SSR - this passes cookies from browser to internal API calls
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  
  // Use useAsyncData for SSR-compatible data fetching
  // The key ensures deduplication across all components
  const asyncData = useAsyncData<AuthUser | null>(
    'auth-user',
    () => $fetch<AuthUser | null>('/api/auth/me', { headers }).catch(() => null),
    {
      // Use cached data from SSR payload if available
      getCachedData: (key, nuxtApp) => {
        return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
      }
    }
  )

  const { data: user, pending, refresh, status } = asyncData

  // Store refresh function for global access
  refreshFn = refresh

  const initialized = computed(() => status.value !== 'pending')

  const login = async (nickname: string, password: string) => {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { nickname, password }
    })
    // Refresh user data after login
    await refresh()
    return result
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      // Immediately clear user on client so UI updates without refresh
      user.value = null
      // Then refresh to ensure all auth-dependent data is in a clean state
      await refresh()
    }
  }

  return {
    user,
    pending,
    initialized,
    refresh,
    login,
    logout,
    // Export the async data for components that need to await
    asyncData
  }
}

// Helper to refresh auth from outside composable context
export const refreshAuth = async () => {
  if (refreshFn) await refreshFn()
}

