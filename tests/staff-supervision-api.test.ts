import { beforeEach, describe, expect, it, vi } from 'vitest'

const staff = { id: 'staff-001', username: 'staff001', role: 'staff' as const, name: 'เจ้าหน้าที่', status: 'active' as const, sessionVersion: 1 }
let query: Record<string, unknown> = { cycleId: 'CYCLE-1', round: '1' }
let body: Record<string, unknown> = {}
const createdAt = new Date('2026-09-09T00:00:00.000Z')
const confirmedRequest = {
  id: 'REQUEST-1', positionTitle: 'Developer',
  companySite: {
    id: 'SITE-1', branchName: 'สำนักงานใหญ่', address: 'บุรีรัมย์', latitude: 15, longitude: 103,
    contactName: 'ฝ่ายบุคคล', contactPhone: null, recordStatus: 'ACTIVE',
    company: { legalName: 'บริษัททดสอบ' }, province: { nameTh: 'บุรีรัมย์', region: 'NORTHEAST' },
  },
  enrollment: {
    cycleId: 'CYCLE-1',
    student: { username: '66123456701', namePrefix: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ', section: '1' },
  },
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => staff) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getRouterParam', () => 'GROUP-1')
vi.stubGlobal('setResponseStatus', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const prisma = {
  placementRequest: {
    findMany: vi.fn(async (args: { select?: { companySiteId?: boolean } }) => args.select?.companySiteId
      ? [{ companySiteId: 'SITE-1' }]
      : [confirmedRequest]),
  },
  supervisionGroup: {
    findMany: vi.fn(async () => [{
      id: 'GROUP-1', cycleId: 'CYCLE-1', round: 'ROUND_1', name: 'กลุ่มนิเทศ 1', createdAt,
      lecturers: [], companies: [{ companySiteId: 'SITE-1' }],
    }]),
    count: vi.fn(async () => 0),
    create: vi.fn(async ({ data }: { data: { cycleId: string, round: 'ROUND_1', name: string, companies: { create: Array<{ companySiteId: string }> } } }) => ({
      id: 'GROUP-NEW', cycleId: data.cycleId, round: data.round, name: data.name, createdAt,
      lecturers: [], companies: data.companies.create,
    })),
    findUnique: vi.fn(async () => ({ id: 'GROUP-1', cycleId: 'CYCLE-1', round: 'ROUND_1', name: 'กลุ่มนิเทศ 1' })),
    findUniqueOrThrow: vi.fn(async () => ({
      id: 'GROUP-1', cycleId: 'CYCLE-1', round: 'ROUND_1', name: 'กลุ่มนิเทศ 1', createdAt,
      lecturers: [{ lecturerId: 'lecturer-001' }], companies: [{ companySiteId: 'SITE-1' }],
    })),
  },
  supervisionGroupCompany: { findMany: vi.fn(async () => []) },
  supervisionGroupLecturer: {
    count: vi.fn(async () => 0), deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })),
  },
  user: {
    findMany: vi.fn(async () => [{ id: 'lecturer-001', namePrefix: 'อาจารย์', firstName: 'หนึ่ง', lastName: 'ทดสอบ' }]),
    count: vi.fn(async () => 1),
  },
  notification: { create: vi.fn(async () => ({ id: 'NOTIFICATION-1' })) },
  $transaction: vi.fn(async (work: unknown) => Array.isArray(work)
    ? Promise.all(work)
    : (work as (client: typeof prisma) => Promise<unknown>)(prisma)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: listGroups } = await import('../server/api/staff/supervision/groups.get')
const { default: suggestGroups } = await import('../server/api/staff/supervision/groups/suggest.post')
const { default: createGroups } = await import('../server/api/staff/supervision/groups.post')
const { default: assignLecturers } = await import('../server/api/staff/supervision/groups/[id]/lecturers.patch')

beforeEach(() => {
  query = { cycleId: 'CYCLE-1', round: '1' }
  body = {}
  vi.clearAllMocks()
})

describe('staff supervision group API', () => {
  it('lists confirmed companies, persisted groups and available lecturers', async () => {
    const result = await listGroups({} as Parameters<typeof listGroups>[0])
    expect(result.companies[0]).toMatchObject({ id: 'SITE-1', studentCount: 1, latitude: 15, longitude: 103 })
    expect(result.groups[0]).toMatchObject({ id: 'GROUP-1', round: 1, companyIds: ['SITE-1'] })
    expect(result.lecturers[0]).toMatchObject({ id: 'lecturer-001' })
  })

  it('suggests deterministic coordinate groups without assigning lecturers', async () => {
    body = { cycleId: 'CYCLE-1', round: 1, maxDistanceKm: 100, maxCompanies: 5 }
    const result = await suggestGroups({} as Parameters<typeof suggestGroups>[0])
    expect(result.groups).toEqual([{ name: 'กลุ่มนิเทศ 1', companyIds: ['SITE-1'] }])
    expect(result.algorithm).toMatchObject({ method: 'complete-link', metric: 'haversine-km' })
  })

  it('persists a suggestion atomically with no lecturer assignment', async () => {
    body = { cycleId: 'CYCLE-1', round: 1, groups: [{ name: 'กลุ่มนิเทศ 1', companyIds: ['SITE-1'] }] }
    const result = await createGroups({} as Parameters<typeof createGroups>[0])
    expect(result[0]).toMatchObject({ name: 'กลุ่มนิเทศ 1', lecturerIds: [], companyIds: ['SITE-1'] })
    expect(prisma.supervisionGroup.create).toHaveBeenCalledOnce()
  })

  it('assigns only an active lecturer after the group exists', async () => {
    body = { lecturerIds: ['lecturer-001'] }
    const result = await assignLecturers({} as Parameters<typeof assignLecturers>[0])
    expect(result.lecturerIds).toEqual(['lecturer-001'])
    expect(prisma.supervisionGroupLecturer.createMany).toHaveBeenCalledWith({
      data: [{ groupId: 'GROUP-1', cycleId: 'CYCLE-1', round: 'ROUND_1', lecturerId: 'lecturer-001' }],
    })
    expect(prisma.notification.create).toHaveBeenCalledOnce()
  })
})
