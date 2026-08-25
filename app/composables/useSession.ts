import type { ApiEnvelope, SessionUser, UserRole } from '~/types/ui'

const currentUser = ref<SessionUser | null>(null)
const loaded = ref(false)

export function useSession() {
  const { request } = useApiClient()

  async function refresh() {
    try {
      const response = await request<ApiEnvelope<SessionUser> | SessionUser | { user: { userId: string, role: UserRole, studentTermId?: string, lecturerId?: string, mustChangePassword?: boolean } }>('/api/auth/session')
      if ('data' in response) currentUser.value = response.data
      else if ('user' in response) currentUser.value = {
        id: response.user.userId,
        role: response.user.role,
        studentTermId: response.user.studentTermId,
        lecturerId: response.user.lecturerId,
        mustChangePassword: response.user.mustChangePassword,
        displayName: response.user.role === 'STUDENT' ? 'นักศึกษา' : response.user.role === 'LECTURER' ? 'อาจารย์' : 'เจ้าหน้าที่'
      }
      else currentUser.value = response
    } catch {
      currentUser.value = null
    } finally {
      loaded.value = true
    }
    return currentUser.value
  }

  async function logout() {
    await request('/api/auth/logout', { method: 'POST' })
    currentUser.value = null
    loaded.value = true
    await navigateTo('/login')
  }

  function hasRole(roles: UserRole[]) {
    return Boolean(currentUser.value && roles.includes(currentUser.value.role))
  }

  return { user: readonly(currentUser), loaded: readonly(loaded), refresh, logout, hasRole }
}
