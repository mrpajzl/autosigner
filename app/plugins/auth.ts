export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth()
  
  // Fetch user on app initialization
  await fetchUser()
})

