export default defineNuxtRouteMiddleware(async (to) => {
  if (['/login', '/activate', '/reset-password'].includes(to.path)) return

  const session = useSession()
  if (!session.loaded.value) await session.refresh()
  if (!session.user.value) return navigateTo('/login')

  const roles = to.meta.roles as Array<'STUDENT' | 'LECTURER' | 'ADMIN'> | undefined
  if (roles && !roles.includes(session.user.value.role)) return navigateTo('/forbidden')
})
