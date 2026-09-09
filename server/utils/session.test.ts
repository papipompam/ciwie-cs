import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = {
  data: { user: undefined as undefined | { id: string, username: string, role: 'student', name: string, status: 'active' | 'first-login', sessionVersion: number } },
  clear: vi.fn(),
  update: vi.fn(),
}
let accountState = { role: 'STUDENT', status: 'ACTIVE', recordStatus: 'ACTIVE', sessionVersion: 1 }

vi.mock('h3', () => ({
  useSession: vi.fn(async () => session),
  clearSession: vi.fn(),
}))
vi.stubGlobal('useRuntimeConfig', () => ({ sessionPassword: 'test-session-password-32-characters-minimum' }))
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
vi.stubGlobal('usePrisma', () => ({
  user: {
    findUnique: vi.fn(async () => session.data.user ? accountState : null),
  },
}))

const { requireUserSession } = await import('./session')
const event = {} as Parameters<typeof requireUserSession>[0]

beforeEach(() => {
  session.clear.mockClear()
  accountState = { role: 'STUDENT', status: 'ACTIVE', recordStatus: 'ACTIVE', sessionVersion: 1 }
  session.data.user = { id: 'student-001', username: '66123456701', role: 'student', name: 'นักศึกษาทดสอบ', status: 'active', sessionVersion: 1 }
})

describe('requireUserSession', () => {
  it('allows an active account to use a business endpoint', async () => {
    await expect(requireUserSession(event, ['student'])).resolves.toMatchObject({ id: 'student-001' })
  })

  it('requires a first-login account to change its password before business APIs', async () => {
    session.data.user = { ...session.data.user!, status: 'first-login' }
    accountState.status = 'FIRST_LOGIN'
    await expect(requireUserSession(event, ['student'])).rejects.toMatchObject({ statusCode: 403, statusMessage: 'PASSWORD_CHANGE_REQUIRED' })
    await expect(requireUserSession(event, undefined, true)).resolves.toMatchObject({ status: 'first-login' })
  })

  it.each([
    { state: { sessionVersion: 2 }, label: 'session version changes' },
    { state: { status: 'SUSPENDED' }, label: 'the account is suspended' },
    { state: { status: 'FIRST_LOGIN' }, label: 'the account is reset to first login' },
    { state: { recordStatus: 'INACTIVE' }, label: 'the account record is inactive' },
  ])('clears and rejects the cookie when $label', async ({ state }) => {
    accountState = { ...accountState, ...state }
    await expect(requireUserSession(event, ['student'])).rejects.toMatchObject({ statusCode: 401 })
    expect(session.clear).toHaveBeenCalledOnce()
  })
})
