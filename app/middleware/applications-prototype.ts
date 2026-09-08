export default defineNuxtRouteMiddleware((to) => {
  const { currentAccount } = useAuthPrototype()
  const requiredRole: ScenarioRole = to.path.startsWith('/staff/applications') ? 'staff' : 'lecturer'
  if (currentAccount.value?.role !== requiredRole) return navigateTo({ path: '/forbidden', query: { from: to.fullPath } })
})
