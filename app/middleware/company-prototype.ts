export default defineNuxtRouteMiddleware((to) => {
  const { currentAccount } = useAuthPrototype()
  const requiredRole = to.path.startsWith('/staff/companies')
    ? 'staff'
    : to.path.startsWith('/lecturer/companies')
      ? 'lecturer'
      : null

  if ((requiredRole && currentAccount.value?.role !== requiredRole) || (!requiredRole && currentAccount.value?.role === 'student')) {
    return navigateTo({ path: '/forbidden', query: { from: to.fullPath } })
  }
})
