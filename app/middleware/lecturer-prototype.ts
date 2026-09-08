export default defineNuxtRouteMiddleware((to) => {
  const { currentAccount } = useAuthPrototype()
  if (currentAccount.value?.role !== 'lecturer') return navigateTo({ path: '/forbidden', query: { from: to.fullPath } })
  const { canAccess } = useLecturerPermissions()
  if (to.path.startsWith('/lecturer/placements') && !canAccess()) return navigateTo({ path: '/forbidden', query: { from: to.fullPath } })
})
