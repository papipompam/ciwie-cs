export default defineNuxtRouteMiddleware((to) => {
  const { currentAccount } = useAuthPrototype()
  const { canAccess } = useLecturerPermissions()
  const allowed = to.path.startsWith('/staff/')
    ? currentAccount.value?.role === 'staff'
    : currentAccount.value?.role === 'lecturer' && canAccess()
  if (!allowed) return navigateTo({ path: '/forbidden', query: { from: to.fullPath } })
})
