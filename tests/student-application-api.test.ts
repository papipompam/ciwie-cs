import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

const request = { body: {} as unknown, id: '' }
interface FakeApplication {
  id: string
  studentAccountId: string
  enrollmentId: string
  activeSlotKey: string | null
  status: string
  [key: string]: unknown
}
type CreateData = Omit<FakeApplication, 'id' | 'studentAccountId'> & Record<string, unknown>
type UpdateData = Partial<CreateData> & Record<string, unknown>
const records: FakeApplication[] = []
const student = { id: 'student-001', username: '66123456701', role: 'student' as const, name: 'นายธนกฤต พูนทรัพย์', status: 'active' as const, sessionVersion: 1 }
const staff = { id: 'staff-001', username: 'staff001', role: 'staff' as const, name: 'นางสาวพิมพ์ชนก ใจดี', status: 'active' as const, sessionVersion: 1 }
let authenticatedUser: typeof student | typeof staff = student

vi.mock('../server/utils/session', () => ({
  requireUserSession: vi.fn(async (_event: unknown, roles?: readonly string[]) => {
    if (roles && !roles.includes(authenticatedUser.role)) throw Object.assign(new Error('FORBIDDEN'), { statusCode: 403, statusMessage: 'FORBIDDEN' })
    return authenticatedUser
  }),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', async () => request.body)
vi.stubGlobal('getRouterParam', () => request.id)
vi.stubGlobal('setResponseStatus', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const uniqueError = () => new Prisma.PrismaClientKnownRequestError('Duplicate active application', {
  code: 'P2002', clientVersion: '7.10.0', meta: { target: ['activeSlotKey'] },
})
const prisma = {
  $transaction: vi.fn(async (work: ((client: typeof prisma) => Promise<unknown>) | Promise<unknown>[]) => typeof work === 'function' ? work(prisma) : Promise.all(work)),
  user: { findMany: vi.fn(async () => [{ id: staff.id }]) },
  cycleEnrollment: { findFirst: vi.fn(async () => ({ id: 'ENROLLMENT-001' })) },
  placementRequest: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'REQUEST-001', ...data })),
  },
  placementRequestStatusHistory: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data) },
  notification: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'NOTIFICATION-001', ...data })),
  },
  studentApplication: {
    findMany: vi.fn(async () => records),
    findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
      const record = records.find(item => item.id === where.id && (authenticatedUser.role === 'staff' || item.studentAccountId === authenticatedUser.id))
      return record ? { ...record, enrollment: { student: { username: student.username } } } : null
    }),
    create: vi.fn(async ({ data }: { data: CreateData }) => {
      if (data.activeSlotKey && records.some(item => item.activeSlotKey === data.activeSlotKey)) throw uniqueError()
      const now = new Date('2026-09-09T01:00:00.000Z')
      const record: FakeApplication = { id: `APP-${records.length + 1}`, studentAccountId: student.id, companySiteId: null, details: null, responseDate: null, createdAt: now, updatedAt: now, ...data }
      records.push(record)
      return record
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }, data: UpdateData }) => {
      const record = records.find(item => item.id === where.id)!
      if (data.activeSlotKey && records.some(item => item.id !== record.id && item.activeSlotKey === data.activeSlotKey)) throw uniqueError()
      Object.assign(record, data, { updatedAt: new Date('2026-09-09T02:00:00.000Z') })
      return record
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { id: string, status: string }, data: UpdateData }) => {
      const record = records.find(item => item.id === where.id && item.status === where.status)
      if (!record) return { count: 0 }
      Object.assign(record, data, { updatedAt: new Date('2026-09-09T02:00:00.000Z') })
      return { count: 1 }
    }),
    findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => records.find(item => item.id === where.id)!),
    deleteMany: vi.fn(async ({ where }: { where: { id: string, status: string } }) => {
      const index = records.findIndex(item => item.id === where.id && item.status === where.status && item.studentAccountId === student.id)
      if (index < 0) return { count: 0 }
      records.splice(index, 1)
      return { count: 1 }
    }),
  },
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: createApplication } = await import('../server/api/student/applications.post')
const { default: updateApplication } = await import('../server/api/student/applications/[id].patch')
const { default: deleteApplication } = await import('../server/api/student/applications/[id].delete')
const event = {} as Parameters<typeof createApplication>[0]
const input = {
  companyName: 'บริษัททดสอบ', position: 'นักพัฒนา', companyLocation: 'บุรีรัมย์',
  recipientName: '  ผู้จัดการฝ่ายบุคคล  ', letterAddress: '  สำนักงานกรุงเทพ  ',
  province: 'บุรีรัมย์',
  latitude: 14.99, longitude: 103.1,
}

beforeEach(() => {
  records.splice(0)
  authenticatedUser = student
  request.body = { ...input }
  request.id = ''
  prisma.placementRequest.create.mockClear()
  prisma.notification.create.mockClear()
  prisma.user.findMany.mockClear()
})

describe('student application API', () => {
  it('creates and edits an application owned by the authenticated student', async () => {
    const created = await createApplication(event)
    expect(created).toMatchObject({ studentId: student.username, recipientName: 'ผู้จัดการฝ่ายบุคคล', letterAddress: 'สำนักงานกรุงเทพ' })

    request.id = created.id
    request.body = { ...input, recipientName: 'ผู้อำนวยการ', province: 'บุรีรัมย์', appliedAt: created.appliedAt, status: 'submitted' }
    const updated = await updateApplication(event)
    expect(updated).toMatchObject({ recipientName: 'ผู้อำนวยการ', companyLocation: 'บุรีรัมย์' })
  })

  it('rejects invalid recipient data before writing', async () => {
    request.body = { ...input, recipientName: '' }
    await expect(createApplication(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(records).toHaveLength(0)
  })

  it('enforces one active company and only unlocks the slot after rejection', async () => {
    const created = await createApplication(event)
    await expect(createApplication(event)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'APPLICATION_ALREADY_ACTIVE' })

    request.id = created.id
    authenticatedUser = staff
    request.body = { status: 'rejected' }
    await updateApplication(event)
    authenticatedUser = student
    request.body = { ...input, companyName: 'บริษัทถัดไป' }
    await expect(createApplication(event)).resolves.toMatchObject({ companyName: 'บริษัทถัดไป' })
  })

  it('requires acceptance before confirming and locks a confirmed selection', async () => {
    const created = await createApplication(event)
    request.id = created.id
    request.body = { status: 'completed' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'COMPANY_ACCEPTANCE_REQUIRED' })

    authenticatedUser = staff
    request.body = { status: 'accepted' }
    await updateApplication(event)
    authenticatedUser = student
    prisma.user.findMany.mockResolvedValueOnce([{ id: staff.id }, { id: 'staff-002' }])
    request.body = { status: 'completed' }
    await expect(updateApplication(event)).resolves.toMatchObject({ status: 'completed' })
    expect(prisma.placementRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ enrollmentId: 'ENROLLMENT-001', status: 'SUBMITTED' }),
    }))
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'PLACEMENT_REQUEST_SUBMITTED',
        recipients: { create: [{ accountId: staff.id }, { accountId: 'staff-002' }] },
      }),
    }))
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'STAFF', status: 'ACTIVE', recordStatus: 'ACTIVE' },
      select: { id: true },
    })
    await expect(updateApplication(event)).resolves.toMatchObject({ status: 'completed' })
    expect(prisma.placementRequest.create).toHaveBeenCalledTimes(1)
    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    request.body = { status: 'rejected' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'APPLICATION_SELECTION_LOCKED' })
  })

  it('lets a student save edited application details together with the company response', async () => {
    const created = await createApplication(event)
    request.id = created.id
    request.body = { ...input, appliedAt: created.appliedAt, status: 'accepted' }
    await expect(updateApplication(event)).resolves.toMatchObject({ status: 'accepted' })
    request.body = { status: 'rejected' }
    await expect(updateApplication(event)).resolves.toMatchObject({ status: 'rejected' })
  })

  it('deletes only rejected records', async () => {
    const created = await createApplication(event)
    request.id = created.id
    await expect(deleteApplication(event)).rejects.toMatchObject({ statusCode: 409 })
    authenticatedUser = staff
    request.body = { status: 'rejected' }
    await updateApplication(event)
    authenticatedUser = student
    await deleteApplication(event)
    expect(records).toHaveLength(0)
  })

  it('does not allow a rejected application to return to an active status', async () => {
    const created = await createApplication(event)
    request.id = created.id
    authenticatedUser = staff
    request.body = { status: 'rejected' }
    await updateApplication(event)
    authenticatedUser = student
    request.body = { status: 'cancelled' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'APPLICATION_REJECTION_LOCKED' })
  })

  it('does not allow staff to accept an application cancelled by the student', async () => {
    const created = await createApplication(event)
    request.id = created.id
    request.body = { status: 'cancelled' }
    await updateApplication(event)
    authenticatedUser = staff
    request.body = { status: 'accepted' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'APPLICATION_STATUS_TRANSITION_INVALID' })
  })

  it('does not let staff cancel an active student application', async () => {
    const created = await createApplication(event)
    request.id = created.id
    authenticatedUser = staff
    request.body = { status: 'cancelled' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'APPLICATION_STATUS_TRANSITION_INVALID' })
  })
})
