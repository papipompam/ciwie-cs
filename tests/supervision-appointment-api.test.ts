import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'lecturer-001', role: 'lecturer' as 'lecturer' | 'staff' | 'student' }
let body: Record<string, unknown> = {}
let assigned = true

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => user) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => 'APPOINTMENT-1')
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getQuery', () => ({ cycleId: 'CYCLE-1', round: '1' }))
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
vi.stubGlobal('setResponseStatus', vi.fn())

const updateAppointment = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'APPOINTMENT-1', ...data }))
const updateManyLecturers = vi.fn(async () => ({ count: 2 }))
const findUnique = vi.fn(async () => ({
  id: 'APPOINTMENT-1', status: 'PUBLISHED',
  groupCompany: {
    group: { lecturers: assigned ? [{ lecturerId: 'lecturer-001' }] : [] },
  },
  lecturers: [{ lecturerId: 'lecturer-001' }, { lecturerId: 'lecturer-002' }],
}))
const findMany = vi.fn(async () => ([{
  id: 'APPOINTMENT-1', appointmentNo: 'SUP-001', scheduledDate: new Date('2026-09-15T00:00:00.000Z'),
  period: 'MORNING', status: 'COMPLETED', splitReason: null, completedAt: new Date('2026-09-15T08:00:00.000Z'),
  resultSummary: 'เรียบร้อย', resultIssues: null, resultSuggestions: null, companyRequirements: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  groupCompany: {
    groupId: 'GROUP-1', cycleId: 'CYCLE-1', round: 'ROUND_1', companySiteId: 'SITE-1',
    group: { name: 'กลุ่มนิเทศ 1', lecturers: [{ lecturerId: 'lecturer-001' }] },
    companySite: { branchName: 'สำนักงานใหญ่', address: '123 ถนนตัวอย่าง', province: { nameTh: 'บุรีรัมย์' }, company: { legalName: 'บริษัท ตัวอย่าง จำกัด' } },
  },
  lecturers: [{ lecturerId: 'lecturer-001', isActual: true, lecturer: { namePrefix: 'อ.', firstName: 'สมชาย', lastName: 'ใจดี' } }],
  students: [{ placementRequest: { positionTitle: 'นักพัฒนาซอฟต์แวร์', enrollment: { student: { username: '66123456701', namePrefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์' } } } }],
}]))
const findGroupCompany = vi.fn(async () => ({ id: 'GROUP-COMPANY-1' }))
const findLecturers = vi.fn(async () => [{ id: 'lecturer-001' }])
const findPlacementRequests = vi.fn(async () => [{ id: 'REQUEST-1', enrollment: { studentId: 'student-001', student: { username: '66123456701' } } }])
const createAppointment = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'APPOINTMENT-NEW', status: 'PUBLISHED', ...data }))

vi.stubGlobal('usePrisma', () => ({
  supervisionAppointment: { findUnique, findMany, update: updateAppointment },
  supervisionGroupCompany: { findFirst: findGroupCompany },
  user: { findMany: findLecturers },
  placementRequest: { findMany: findPlacementRequests },
  supervisionAppointmentLecturer: { updateMany: updateManyLecturers },
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    supervisionAppointment: { update: updateAppointment },
    supervisionAppointmentLecturer: { updateMany: updateManyLecturers },
  })),
}))

const { default: listAppointments } = await import('../server/api/supervision/appointments.get')
const { default: getAppointment } = await import('../server/api/supervision/appointments/[id].get')
const { default: updateResult } = await import('../server/api/supervision/appointments/[id].patch')
const { default: createSupervisionAppointment } = await import('../server/api/staff/supervision/appointments.post')

beforeEach(() => {
  user = { id: 'lecturer-001', role: 'lecturer' }
  assigned = true
  body = {
    action: 'complete',
    summary: ' เรียบร้อย ', issues: '', suggestions: '', companyRequirements: '',
    actualLecturerIds: ['lecturer-001'],
  }
  vi.clearAllMocks()
})

describe('supervision appointment APIs', () => {
  it('lists only appointments accessible to a lecturer and maps the persisted shape', async () => {
    const result = await listAppointments({} as Parameters<typeof listAppointments>[0])
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        groupCompany: expect.objectContaining({ cycleId: 'CYCLE-1', round: 'ROUND_1' }),
        OR: expect.any(Array),
      }),
    }))
    expect(result.appointments[0]).toMatchObject({
      id: 'APPOINTMENT-1', groupId: 'GROUP-1', companyId: 'SITE-1', round: 1,
      studentIds: ['66123456701'], lecturerIds: ['lecturer-001'], status: 'completed',
      result: { summary: 'เรียบร้อย', actualLecturerIds: ['lecturer-001'] },
      display: {
        companyName: 'บริษัท ตัวอย่าง จำกัด', province: 'บุรีรัมย์', groupName: 'กลุ่มนิเทศ 1',
        lecturers: [{ id: 'lecturer-001', name: 'อ.สมชาย ใจดี' }],
        students: [{ id: '66123456701', name: 'นายธนกฤต พูนทรัพย์', position: 'นักพัฒนาซอฟต์แวร์' }],
      },
    })
  })

  it('limits a student list to their own published appointments', async () => {
    user = { id: 'student-001', role: 'student' }
    await listAppointments({} as Parameters<typeof listAppointments>[0])
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { not: 'DRAFT' },
        students: { some: { placementRequest: { enrollment: { studentId: 'student-001' } } } },
      }),
    }))
  })

  it('gets one appointment only when the lecturer is assigned', async () => {
    findUnique.mockResolvedValueOnce((await findMany())[0])
    await expect(getAppointment({} as Parameters<typeof getAppointment>[0])).resolves.toMatchObject({
      appointment: { id: 'APPOINTMENT-1', lecturerIds: ['lecturer-001'] },
    })
  })

  it('lets an assigned lecturer complete an appointment atomically', async () => {
    await expect(updateResult({} as Parameters<typeof updateResult>[0])).resolves.toMatchObject({ status: 'completed' })
    expect(updateManyLecturers).toHaveBeenCalledWith(expect.objectContaining({ data: { isActual: false } }))
    expect(updateAppointment).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED', resultSummary: 'เรียบร้อย', resultRecordedById: 'lecturer-001' }),
    }))
  })

  it('rejects completion by an unassigned lecturer', async () => {
    assigned = false
    findUnique.mockResolvedValueOnce({
      id: 'APPOINTMENT-1', status: 'PUBLISHED',
      groupCompany: { group: { lecturers: [] } },
      lecturers: [{ lecturerId: 'lecturer-002' }],
    })
    await expect(updateResult({} as Parameters<typeof updateResult>[0])).rejects.toMatchObject({ statusCode: 403 })
  })

  it('updates an editable appointment schedule and participants atomically', async () => {
    body = {
      action: 'update-schedule', date: '2026-09-21', period: 'afternoon',
      lecturerIds: ['lecturer-001', 'lecturer-002'],
    }
    const deleteMany = vi.fn(async () => ({ count: 1 }))
    const createMany = vi.fn(async () => ({ count: 2 }))
    vi.stubGlobal('usePrisma', () => ({
      supervisionAppointment: { findUnique, update: updateAppointment },
      user: { findMany: vi.fn(async () => [{ id: 'lecturer-001' }, { id: 'lecturer-002' }]) },
      $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
        supervisionAppointment: { update: updateAppointment },
        supervisionAppointmentLecturer: { deleteMany, createMany },
      })),
    }))
    await expect(updateResult({} as Parameters<typeof updateResult>[0])).resolves.toMatchObject({ status: 'published' })
    expect(createMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ lecturerId: 'lecturer-001', role: 'LEAD' }),
      expect.objectContaining({ lecturerId: 'lecturer-002', role: 'PARTICIPANT' }),
    ] })
  })

  it('notifies students when staff republishes a postponed appointment', async () => {
    user = { id: 'staff-001', role: 'staff' }
    body = { action: 'update-schedule', date: '2026-09-21', period: 'afternoon', lecturerIds: ['lecturer-001'] }
    findUnique.mockResolvedValueOnce({
      id: 'APPOINTMENT-1', status: 'POSTPONED',
      groupCompany: { group: { lecturers: [] } },
      lecturers: [{ lecturerId: 'lecturer-001' }],
      students: [{ placementRequest: { enrollment: { studentId: 'student-001' } } }],
    })
    const notificationCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'NOTIFICATION-1', ...data }))
    vi.stubGlobal('usePrisma', () => ({
      supervisionAppointment: { findUnique, update: updateAppointment },
      user: { findMany: findLecturers },
      $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
        supervisionAppointment: { update: updateAppointment },
        supervisionAppointmentLecturer: {
          deleteMany: vi.fn(async () => ({ count: 1 })),
          createMany: vi.fn(async () => ({ count: 1 })),
        },
        notification: { create: notificationCreate },
      })),
    }))

    await expect(updateResult({} as Parameters<typeof updateResult>[0])).resolves.toMatchObject({ status: 'published' })
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'SUPERVISION_SCHEDULE_PUBLISHED',
        appointmentId: 'APPOINTMENT-1',
        recipients: { create: [{ accountId: 'student-001' }] },
      }),
    }))
  })

  it('lets staff create and publish an appointment for confirmed students', async () => {
    user = { id: 'staff-001', role: 'staff' }
    body = {
      cycleId: 'CYCLE-1', round: 1, groupId: 'GROUP-1', companyId: 'SITE-1',
      studentIds: ['66123456701'], date: '2026-09-20', period: 'morning',
      lecturerIds: ['lecturer-001'], publish: true,
    }
    const transaction = vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
      supervisionAppointment: { create: createAppointment },
      notification: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'NOTIFICATION-1', ...data })) },
    }))
    vi.stubGlobal('usePrisma', () => ({
      supervisionGroupCompany: { findFirst: findGroupCompany },
      user: { findMany: findLecturers },
      placementRequest: { findMany: findPlacementRequests },
      $transaction: transaction,
    }))
    await expect(createSupervisionAppointment({} as Parameters<typeof createSupervisionAppointment>[0])).resolves.toMatchObject({
      id: 'APPOINTMENT-NEW', status: 'published',
    })
    expect(createAppointment).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        groupCompanyId: 'GROUP-COMPANY-1', status: 'PUBLISHED',
        lecturers: { create: [{ lecturerId: 'lecturer-001', source: 'MANUAL', role: 'LEAD' }] },
        students: { create: [{ placementRequestId: 'REQUEST-1' }] },
      }),
    }))
  })

  it('notifies every student when staff publishes an appointment', async () => {
    user = { id: 'staff-001', role: 'staff' }
    body = {
      cycleId: 'CYCLE-1', round: 1, groupId: 'GROUP-1', companyId: 'SITE-1',
      studentIds: ['66123456701'], date: '2026-09-20', period: 'morning',
      lecturerIds: ['lecturer-001'], publish: true,
    }
    const notificationCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'NOTIFICATION-1', ...data }))
    vi.stubGlobal('usePrisma', () => ({
      supervisionGroupCompany: { findFirst: findGroupCompany },
      user: { findMany: findLecturers },
      placementRequest: { findMany: findPlacementRequests },
      $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
        supervisionAppointment: { create: createAppointment },
        notification: { create: notificationCreate },
      })),
    }))

    await expect(createSupervisionAppointment({} as Parameters<typeof createSupervisionAppointment>[0])).resolves.toMatchObject({ status: 'published' })
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'SUPERVISION_SCHEDULE_PUBLISHED',
        appointmentId: 'APPOINTMENT-NEW',
        recipients: { create: [{ accountId: 'student-001' }] },
      }),
    }))
  })
})
