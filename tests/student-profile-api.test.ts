import { beforeEach, describe, expect, it, vi } from 'vitest'

const student = { id: 'student-001', username: '66123456701', role: 'student' as const, name: 'นักศึกษาทดสอบ', status: 'active' as const, sessionVersion: 1 }
const update = vi.fn(async (input?: { data: Record<string, unknown> }) => ({
  id: student.id, username: student.username, namePrefix: input?.data.namePrefix, firstName: input?.data.firstName, lastName: input?.data.lastName, cohortYear: 2566, section: input?.data.section, phone: input?.data.phone, email: input?.data.email,
}))
const prisma = {
  user: { update },
  auditLog: { create: vi.fn(async () => ({})) },
  $transaction: vi.fn(async (work: (transaction: typeof prisma) => Promise<unknown>) => work(prisma)),
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => student) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
const readBody = vi.fn(async () => ({
  prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', section: '1', phone: '0812345678', email: 'somchai@example.com',
}))
vi.stubGlobal('readBody', readBody)
vi.stubGlobal('usePrisma', () => prisma)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const { default: updateProfile } = await import('../server/api/auth/profile.patch')

describe('student profile API', () => {
  beforeEach(() => {
    update.mockClear()
    readBody.mockResolvedValue({ prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', section: '1', phone: '0812345678', email: 'somchai@example.com' })
  })

  it('updates only the authenticated student basic profile', async () => {
    await expect(updateProfile({} as Parameters<typeof updateProfile>[0])).resolves.toMatchObject({
      profile: { id: student.id, username: student.username, firstName: 'สมชาย', section: '1', email: 'somchai@example.com' },
    })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: student.id },
      data: expect.objectContaining({ firstName: 'สมชาย', section: '1', phone: '0812345678' }),
    }))
  })

  it('rejects an invalid student section without updating the account', async () => {
    readBody.mockResolvedValue({ prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', section: '3', phone: '0812345678', email: 'somchai@example.com' })

    await expect(updateProfile({} as Parameters<typeof updateProfile>[0])).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'STUDENT_PROFILE_INVALID',
    })
    expect(update).not.toHaveBeenCalled()
  })
})
