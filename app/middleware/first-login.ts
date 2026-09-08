export default defineNuxtRouteMiddleware(() => {
  const { authenticated, currentAccount } = useAuthPrototype()
  if (!authenticated.value || !currentAccount.value) return navigateTo('/login')
  if (currentAccount.value.status !== 'first-login') return navigateTo('/')
})
