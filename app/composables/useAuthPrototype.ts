export type PrototypeAccountStatus = 'active' | 'first-login' | 'suspended' | 'terminated'

export interface PrototypeAccount {
  id: string
  username: string
  role: ScenarioRole
  name: string
  status: PrototypeAccountStatus
}

export type PrototypeLoginResult =
  | { status: 'success', requiresPasswordChange: boolean }
  | { status: 'invalid' | 'locked' | 'suspended' | 'terminated' }

interface PrototypeAccountRecord extends PrototypeAccount {
  password: string
}

interface PrototypeAuthState {
  authenticated: boolean
  currentAccount: PrototypeAccount | null
  passwords: Record<string, string>
  failedAttempts: Record<string, number>
  lockedUntil: Record<string, number>
}

const prototypeAccounts: PrototypeAccountRecord[] = [
  { id: 'staff-001', username: 'staff001', password: 'Cwie@2569', role: 'staff', name: 'นางสาวพิมพ์ชนก ใจดี', status: 'active' },
  { id: 'lecturer-001', username: 'lecturer001', password: 'Cwie@2569', role: 'lecturer', name: 'อาจารย์ผู้นิเทศ', status: 'active' },
  { id: 'student-001', username: '66123456701', password: 'Cwie@2569', role: 'student', name: 'นายธนกฤต พูนทรัพย์', status: 'active' },
  { id: 'student-025', username: '66123456725', password: 'Temp@2569', role: 'student', name: 'นางสาวณัฐณิชา แสงทอง', status: 'first-login' },
  { id: 'staff-002', username: 'staff002', password: 'Cwie@2569', role: 'staff', name: 'นายกิตติพงษ์ สุขใจ', status: 'suspended' },
  { id: 'lecturer-999', username: 'lecturer999', password: 'Cwie@2569', role: 'lecturer', name: 'อาจารย์ตัวอย่าง ยุติใช้งาน', status: 'terminated' },
]

export const useAuthPrototype = () => {
  const authState = useState<PrototypeAuthState>('auth-prototype', () => ({
    authenticated: false,
    currentAccount: null,
    passwords: Object.fromEntries(prototypeAccounts.map(account => [account.username, account.password])),
    failedAttempts: {},
    lockedUntil: {},
  }))
  const { scenario } = useScenario()
  const sessionChecked = useState('auth-session-checked', () => false)

  const authenticated = computed(() => authState.value.authenticated)
  const currentAccount = computed(() => authState.value.currentAccount)

  const login = async (username: string, password: string): Promise<PrototypeLoginResult> => {
    try {
      const result = await $fetch<{ account: PrototypeAccount, requiresPasswordChange: boolean }>('/api/auth/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      })
      authState.value.authenticated = true
      authState.value.currentAccount = result.account
      sessionChecked.value = true
      scenario.value.role = result.account.role
      scenario.value.userName = result.account.name
      return { status: 'success', requiresPasswordChange: result.requiresPasswordChange }
    }
    catch (cause) {
      const error = cause as { data?: { statusMessage?: string }, statusMessage?: string }
      const status = error.data?.statusMessage ?? error.statusMessage
      if (status === 'ACCOUNT_LOCKED') return { status: 'locked' }
      if (status === 'ACCOUNT_SUSPENDED') return { status: 'suspended' }
      if (status === 'ACCOUNT_TERMINATED') return { status: 'terminated' }
      return { status: 'invalid' }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await $fetch('/api/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } })
    }
    catch (cause) {
      const error = cause as { data?: { statusMessage?: string } }
      if (error.data?.statusMessage === 'CURRENT_PASSWORD_INVALID') throw new Error('current-password-invalid', { cause })
      throw cause
    }
  }

  const completeFirstLogin = async (newPassword: string) => {
    const account = authState.value.currentAccount
    if (!account || account.status !== 'first-login') throw new Error('first-login-account-required')
    await $fetch('/api/auth/password', { method: 'PATCH', body: { newPassword } })
    authState.value.currentAccount = { ...account, status: 'active' }
  }

  const restoreSession = async () => {
    if (sessionChecked.value) return
    const sessionEndpoint: string = '/api/auth/session'
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const result = await $fetch<{ account: PrototypeAccount | null }>(sessionEndpoint, { headers })
    authState.value.currentAccount = result.account
    authState.value.authenticated = Boolean(result.account)
    if (result.account) {
      scenario.value.role = result.account.role
      scenario.value.userName = result.account.name
    }
    sessionChecked.value = true
  }

  const switchPrototypeRole = async (role: ScenarioRole) => {
    if (!import.meta.dev) return
    const result = await $fetch<{ account: PrototypeAccount }>('/api/auth/prototype', { method: 'POST', body: { role } })
    const account = result.account
    authState.value.authenticated = true
    authState.value.currentAccount = account
    scenario.value.role = account.role
    scenario.value.userName = account.name
  }

  const logout = async () => {
    await $fetch('/api/auth/session', { method: 'DELETE' })
    authState.value.authenticated = false
    authState.value.currentAccount = null
    sessionChecked.value = true
  }

  return { authenticated, currentAccount, login, changePassword, completeFirstLogin, restoreSession, switchPrototypeRole, logout }
}
