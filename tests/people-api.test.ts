import { beforeEach, describe, expect, it, vi } from 'vitest'

let body: Record<string, unknown> = {}
let query = { type: 'student' }
let sessionUser = { id: 'staff-001', role: 'staff' }
const person = {
  id: 'student-internal-1', username: '66123456701', role: 'STUDENT', status: 'ACTIVE', recordStatus: 'ACTIVE',
  namePrefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์', gender: null, section: '1',
  cycleEnrollments: [{ cycle: { label: 'ภาคเรียนที่ 2/2569' }, placementRequests: [{ companyNameSnapshot: 'บริษัท ตัวอย่าง จำกัด' }] }],
  auditLogs: [],
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => sessionUser) }))
vi.mock('../server/utils/password', () => ({ hashPassword: vi.fn(async () => 'hashed-password') }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getRouterParam', () => '66123456701')
vi.stubGlobal('setResponseStatus', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => ({ initialAccountPassword: 'Cwie@2569' }))
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const findMany = vi.fn(async () => [person])
const findUser = vi.fn(async ({ where }: { where: { username?: string } }) => where.username === 'new-student' ? null : ({ id: 'student-internal-1', username: '66123456701', role: 'STUDENT', status: 'ACTIVE', recordStatus: 'ACTIVE' }))
const findStudent = vi.fn(async () => ({ id: 'student-internal-1' }))
const createUser = vi.fn(async () => ({ id: 'student-new' }))
const updateUser = vi.fn(async () => ({ id: 'student-internal-1' }))
const findCycle = vi.fn(async () => ({ id: 'CYCLE-1', targetCohortYear: 2566 }))
const createEnrollment = vi.fn(async () => ({ id: 'ENROLLMENT-1' }))
const upsertEnrollment = vi.fn(async () => ({ id: 'ENROLLMENT-1' }))
const updateEnrollments = vi.fn(async () => ({ count: 1 }))
const createAudit = vi.fn(async () => ({ id: 1n }))
const findAudits = vi.fn(async () => [{
  id: 1n, entityId: 'student-internal-1', action: 'ระงับบัญชีชั่วคราว', reason: null,
  metadata: { detail: 'ปรับสถานะบัญชี' }, occurredAt: new Date('2026-09-09T00:00:00.000Z'),
  actor: { namePrefix: 'นางสาว', firstName: 'พิมพ์ชนก', lastName: 'ใจดี' },
}])
const findPerson = vi.fn(async () => person)

vi.stubGlobal('usePrisma', () => ({
  user: { findMany, findUnique: findUser, findFirst: findStudent },
  auditLog: { findMany: findAudits },
  coopCycle: { findFirst: findCycle },
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    user: { create: createUser, update: updateUser, findUniqueOrThrow: findPerson },
    coopCycle: { findFirst: findCycle },
    cycleEnrollment: { create: createEnrollment, upsert: upsertEnrollment, updateMany: updateEnrollments },
    auditLog: { create: createAudit, findMany: findAudits },
  })),
}))

const { default: listPeople } = await import('../server/api/staff/people.get')
const { default: createPerson } = await import('../server/api/staff/people.post')
const { default: updatePerson } = await import('../server/api/staff/people/[id].patch')
const { default: lecturerUpdateStudent } = await import('../server/api/people/[id].patch')
const { default: listSharedPeople } = await import('../server/api/people.get')

beforeEach(() => {
  body = {}
  query = { type: 'student' }
  sessionUser = { id: 'staff-001', role: 'staff' }
  vi.clearAllMocks()
})

describe('people APIs', () => {
  it('lists people using usernames as visible IDs and keeps the internal account ID', async () => {
    const result = await listPeople({} as Parameters<typeof listPeople>[0])
    expect(result.people[0]).toMatchObject({
      id: '66123456701', accountId: 'student-internal-1', type: 'student', section: 'หมู่ 1',
      cycle: 'ภาคเรียนที่ 2/2569', company: 'บริษัท ตัวอย่าง จำกัด',
      activities: [expect.objectContaining({ action: 'ระงับบัญชีชั่วคราว', actor: 'นางสาวพิมพ์ชนก ใจดี' })],
    })
  })

  it('creates a first-login student account and cycle enrollment atomically', async () => {
    body = {
      type: 'student', id: 'new-student', prefix: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ',
      cycle: 'ภาคเรียนที่ 2/2569', section: 'หมู่ 1',
    }
    await createPerson({} as Parameters<typeof createPerson>[0])
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      username: 'new-student', passwordHash: 'hashed-password', role: 'STUDENT', status: 'FIRST_LOGIN',
    }) }))
    expect(createEnrollment).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: 'student-new', cycleId: 'CYCLE-1' }) }))
    expect(createAudit).toHaveBeenCalled()
  })

  it('rejects a lecturer prefix for a student account', async () => {
    body = {
      type: 'student', id: 'new-student', prefix: 'อาจารย์', firstName: 'ทดสอบ', lastName: 'ระบบ',
      cycle: 'ภาคเรียนที่ 2/2569', section: 'หมู่ 1',
    }
    await expect(createPerson({} as Parameters<typeof createPerson>[0])).rejects.toMatchObject({ statusCode: 400 })
    expect(createUser).not.toHaveBeenCalled()
  })

  it('requires explicit gender when creating a lecturer', async () => {
    body = { type: 'lecturer', id: 'new-lecturer', prefix: 'อาจารย์', firstName: 'ทดสอบ', lastName: 'ระบบ' }
    await expect(createPerson({} as Parameters<typeof createPerson>[0])).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'LECTURER_GENDER_REQUIRED',
    })
  })

  it('transfers an existing active enrollment before moving a student to another cycle', async () => {
    body = {
      id: '66123456701', prefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์',
      cycle: 'ภาคเรียนที่ 1/2570', section: 'หมู่ 1',
    }
    await updatePerson({} as Parameters<typeof updatePerson>[0])
    expect(updateEnrollments).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'student-internal-1', enrollmentStatus: 'ACTIVE', cycleId: { not: 'CYCLE-1' } },
      data: expect.objectContaining({ enrollmentStatus: 'TRANSFERRED_OUT', currentStudentKey: null }),
    }))
    expect(upsertEnrollment).toHaveBeenCalled()
  })

  it('increments the session version when suspending an account', async () => {
    body = { action: 'suspend' }
    await updatePerson({} as Parameters<typeof updatePerson>[0])
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'student-internal-1' },
      data: { status: 'SUSPENDED', recordStatus: 'ACTIVE', sessionVersion: { increment: 1 } },
    })
  })

  it('keeps lecturer student-name editing separate from document-review permission', async () => {
    sessionUser = { id: 'lecturer-1', role: 'lecturer' }
    body = { prefix: 'นาย', firstName: 'ชื่อใหม่', lastName: 'นามสกุลใหม่' }
    await lecturerUpdateStudent({} as Parameters<typeof lecturerUpdateStudent>[0])
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'student-internal-1' },
      data: { namePrefix: 'นาย', firstName: 'ชื่อใหม่', lastName: 'นามสกุลใหม่' },
    })
  })

  it('does not expose audit activity when a lecturer loads the shared directory', async () => {
    sessionUser = { id: 'lecturer-1', role: 'lecturer' }
    const result = await listSharedPeople({} as Parameters<typeof listSharedPeople>[0])
    expect(findAudits).not.toHaveBeenCalled()
    expect(result.people[0]?.activities).toEqual([])
  })
})
