import { describe, expect, it, vi } from 'vitest'

const storedUser = { id: 'student-001', username: '66123456701', role: 'student' as const, name: 'นาย ชื่อเก่า นามสกุลเก่า', status: 'active' as const, sessionVersion: 1 }
const session = { data: { user: storedUser }, clear: vi.fn() }
const prisma = {
  user: {
    findUnique: vi.fn(async () => ({
      role: 'STUDENT', status: 'ACTIVE', recordStatus: 'ACTIVE', sessionVersion: 1,
      namePrefix: 'นาย', firstName: 'ชื่อใหม่', lastName: 'นามสกุลใหม่',
    })),
  },
}

vi.mock('h3', () => ({
  useSession: vi.fn(async () => session),
  clearSession: vi.fn(),
}))
vi.stubGlobal('usePrisma', () => prisma)
vi.stubGlobal('useRuntimeConfig', () => ({ sessionPassword: 'x'.repeat(32) }))

const { getUserSession } = await import('../server/utils/session')

describe('user session', () => {
  it('returns the current profile name instead of the stale session snapshot', async () => {
    await expect(getUserSession({} as Parameters<typeof getUserSession>[0])).resolves.toMatchObject({
      name: 'นาย ชื่อใหม่ นามสกุลใหม่',
    })
  })
})
