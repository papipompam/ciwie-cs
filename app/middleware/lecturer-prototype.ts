export default defineNuxtRouteMiddleware((to) => {
  const { currentAccount } = useAuthPrototype()
  if (currentAccount.value?.role !== 'lecturer') return navigateTo({ path: '/forbidden', query: { from: to.fullPath } })
})
