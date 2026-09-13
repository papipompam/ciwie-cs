import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'student-001', username: 'student001', role: 'student' as const, name: 'นักศึกษาทดสอบ', status: 'active' as const, sessionVersion: 1 }
const account = { passwordHash: 'stored-hash', status: 'ACTIVE' as 'ACTIVE' | 'FIRST_LOGIN' }
const prisma = {
  user: {
    findUnique: vi.fn(async () => account),
    update: vi.fn(async () => ({ sessionVersion: 2 })),
  },
}

vi.mock('../server/utils/session', () => ({
  requireUserSession: vi.fn(async () => user),
  setUserSession: vi.fn(),
}))
vi.mock('../server/utils/password', () => ({
  hashPassword: vi.fn(async () => 'new-hash'),
  verifyPassword: vi.fn(async () => true),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', vi.fn(async () => ({ currentPassword: 'current-password', newPassword: 'new-password' })))
vi.stubGlobal('usePrisma', () => prisma)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const { default: changePassword } = await import('../server/api/auth/password.patch')

describe('password change API', () => {
  beforeEach(() => {
    user = { id: 'student-001', username: 'student001', role: 'student', name: 'นักศึกษาทดสอบ', status: 'active', sessionVersion: 1 }
    account.status = 'ACTIVE'
    prisma.user.update.mockClear()
  })

  it('rejects password changes by students after first login', async () => {
    await expect(changePassword({} as Parameters<typeof changePassword>[0])).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'STUDENT_PASSWORD_CHANGE_NOT_ALLOWED',
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('allows a student to set a password during first login', async () => {
    account.status = 'FIRST_LOGIN'

    await expect(changePassword({} as Parameters<typeof changePassword>[0])).resolves.toEqual({ status: 'success' })
    expect(prisma.user.update).toHaveBeenCalledOnce()
  })
})
