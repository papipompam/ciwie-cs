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
  { id: 'lecturer-001', username: 'lecturer001', password: 'Cwie@2569', role: 'lecturer', name: 'อาจารย์ผู้ตรวจคำร้อง', status: 'active' },
  { id: 'student-001', username: '66123456701', password: 'Cwie@2569', role: 'student', name: 'นายธนกฤต พูนทรัพย์', status: 'active' },
  { id: 'student-025', username: '66123456725', password: 'Temp@2569', role: 'student', name: 'นางสาวณัฐณิชา แสงทอง', status: 'first-login' },
  { id: 'staff-002', username: 'staff002', password: 'Cwie@2569', role: 'staff', name: 'นายกิตติพงษ์ สุขใจ', status: 'suspended' },
  { id: 'lecturer-999', username: 'lecturer999', password: 'Cwie@2569', role: 'lecturer', name: 'อาจารย์ตัวอย่าง ยุติใช้งาน', status: 'terminated' },
]

const publicAccount = ({ password: _password, ...account }: PrototypeAccountRecord): PrototypeAccount => account

export const useAuthPrototype = () => {
  const authState = useState<PrototypeAuthState>('auth-prototype', () => ({
    authenticated: false,
    currentAccount: null,
    passwords: Object.fromEntries(prototypeAccounts.map(account => [account.username, account.password])),
    failedAttempts: {},
    lockedUntil: {},
  }))
  const { scenario } = useScenario()

  const authenticated = computed(() => authState.value.authenticated)
  const currentAccount = computed(() => authState.value.currentAccount)

  const login = async (username: string, password: string): Promise<PrototypeLoginResult> => {
    await new Promise(resolve => setTimeout(resolve, 350))
    const normalizedUsername = username.trim()
    const account = prototypeAccounts.find(item => item.username === normalizedUsername)
    const lockedUntil = authState.value.lockedUntil[normalizedUsername] ?? 0

    if (lockedUntil > Date.now()) return { status: 'locked' }
    if (!account || authState.value.passwords[normalizedUsername] !== password) {
      const failedAttempts = (authState.value.failedAttempts[normalizedUsername] ?? 0) + 1
      authState.value.failedAttempts[normalizedUsername] = failedAttempts
      if (failedAttempts >= 3) {
        authState.value.lockedUntil[normalizedUsername] = Date.now() + 60_000
        authState.value.failedAttempts[normalizedUsername] = 0
        return { status: 'locked' }
      }
      return { status: 'invalid' }
    }
    if (account.status === 'suspended') return { status: 'suspended' }
    if (account.status === 'terminated') return { status: 'terminated' }

    authState.value.authenticated = true
    authState.value.currentAccount = publicAccount(account)
    authState.value.failedAttempts[normalizedUsername] = 0
    scenario.value.role = account.role
    scenario.value.userName = account.name
    return { status: 'success', requiresPasswordChange: account.status === 'first-login' }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const account = authState.value.currentAccount
    if (!account || authState.value.passwords[account.username] !== currentPassword) throw new Error('current-password-invalid')
    authState.value.passwords[account.username] = newPassword
  }

  const completeFirstLogin = async (newPassword: string) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const account = authState.value.currentAccount
    if (!account || account.status !== 'first-login') throw new Error('first-login-account-required')
    authState.value.passwords[account.username] = newPassword
    authState.value.currentAccount = { ...account, status: 'active' }
  }

  const switchPrototypeRole = (role: ScenarioRole) => {
    const account = prototypeAccounts.find(item => item.role === role && item.status === 'active')
    if (!account) return
    authState.value.authenticated = true
    authState.value.currentAccount = publicAccount(account)
    scenario.value.role = account.role
    scenario.value.userName = account.name
  }

  const logout = async () => {
    authState.value.authenticated = false
    authState.value.currentAccount = null
  }

  return { authenticated, currentAccount, login, changePassword, completeFirstLogin, switchPrototypeRole, logout }
}
