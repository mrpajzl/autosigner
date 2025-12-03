export interface AuthUser {
  id: string
  nickname: string
  email?: string
  role: string
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const pending = useState<boolean>('auth-pending', () => true)
  const initialized = useState<boolean>('auth-initialized', () => false)

  const fetchUser = async () => {
    pending.value = true
    try {
      const data = await $fetch<AuthUser | null>('/api/auth/me')
      user.value = data
    } catch {
      user.value = null
    } finally {
      pending.value = false
      initialized.value = true
    }
  }

  const login = async (nickname: string, password: string) => {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { nickname, password }
    })
    await fetchUser()
    return result
  }

  const logout = async () => {
    await $fetch('/api/auth/signout', { method: 'POST' })
    user.value = null
  }

  return {
    user,
    pending,
    initialized,
    fetchUser,
    login,
    logout
  }
}

