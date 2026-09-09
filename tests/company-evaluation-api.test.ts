import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'staff-001', role: 'staff' as 'staff' | 'lecturer' }
let appointmentStatus = 'COMPLETED'
const ratings = {
  field_relevance: 5, work_scope: 4, learning_opportunity: 5, supervisor_readiness: 4,
  student_support: 5, environment: 4, safety: 5, resources: 4, allowance: 3,
  transportation: 4, public_transport: 3, nearby_accommodation: 4, coordination: 5,
}
let body: Record<string, unknown> = {
  status: 'submitted', ratings, recommendation: 'recommended',
  observations: 'พร้อมดูแล', companyRequirements: 'นักศึกษาพัฒนาเว็บ', issues: '', suggestions: '',
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => user) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => 'APPOINTMENT-1')
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
const upsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({ id: 'EVALUATION-1', ...create }))
const findUnique = vi.fn(async () => ({
  id: 'APPOINTMENT-1', status: appointmentStatus,
  groupCompany: { group: { lecturers: [{ lecturerId: 'lecturer-001' }] } },
  lecturers: [], companyEvaluation: null,
}))
vi.stubGlobal('usePrisma', () => ({ supervisionAppointment: { findUnique }, companyEvaluation: { upsert } }))

const { default: saveCompanyEvaluation } = await import('../server/api/evaluations/companies/[appointmentId].put')

beforeEach(() => {
  user = { id: 'staff-001', role: 'staff' }
  appointmentStatus = 'COMPLETED'
  body = {
    status: 'submitted', ratings, recommendation: 'recommended',
    observations: 'พร้อมดูแล', companyRequirements: 'นักศึกษาพัฒนาเว็บ', issues: '', suggestions: '',
  }
  vi.clearAllMocks()
})

describe('company evaluation API', () => {
  it('allows staff to submit every requested company criterion', async () => {
    await expect(saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])).resolves.toMatchObject({ status: 'submitted' })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ evaluatorId: 'staff-001', environmentScore: 4, allowanceScore: 3, nearbyAccommodationScore: 4, companyRequirements: 'นักศึกษาพัฒนาเว็บ' }),
    }))
  })

  it('allows only a lecturer assigned to the completed supervision', async () => {
    user = { id: 'lecturer-other', role: 'lecturer' }
    await expect(saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])).rejects.toMatchObject({ statusCode: 403 })
    user = { id: 'lecturer-001', role: 'lecturer' }
    await expect(saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])).resolves.toMatchObject({ status: 'submitted' })
  })

  it('rejects incomplete submitted ratings and unfinished supervision', async () => {
    body = { ...body, ratings: { field_relevance: 5 } }
    await expect(saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])).rejects.toMatchObject({ statusCode: 400 })
    body = { ...body, ratings }
    appointmentStatus = 'PUBLISHED'
    await expect(saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])).rejects.toMatchObject({ statusCode: 409 })
  })
})
