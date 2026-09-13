import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'staff-001', role: 'staff' as 'staff' | 'lecturer' }
let appointmentStatus = 'COMPLETED'
const ratings = {
  field_relevance: 5, work_scope: 4, learning_opportunity: 5, supervisor_readiness: 4,
  student_support: 5, environment: 4, safety: 5, resources: 4, allowance: 3,
  transportation: 4, public_transport: 3, nearby_accommodation: 4, coordination: 5,
}
let body: Record<string, unknown> = {
  status: 'submitted', ratings,
  observations: 'พร้อมดูแล', companyRequirements: 'นักศึกษาพัฒนาเว็บ', issues: '', suggestions: '',
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => user) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => 'APPOINTMENT-1')
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
const upsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({ id: 'EVALUATION-1', ...create }))
const notificationCreate = vi.fn(async () => ({ id: 'NOTIFICATION-1' }))
const findUnique = vi.fn(async () => ({
  id: 'APPOINTMENT-1', status: appointmentStatus,
  groupCompany: { group: { lecturers: [{ lecturerId: 'lecturer-001' }] } },
  lecturers: [], companyEvaluations: [],
}))
vi.stubGlobal('usePrisma', () => ({
  supervisionAppointment: { findUnique },
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    companyEvaluation: { upsert },
    user: { findMany: vi.fn(async () => [{ id: 'staff-001' }]) },
    notification: { create: notificationCreate },
  })),
}))

const { default: saveCompanyEvaluation } = await import('../server/api/evaluations/companies/[appointmentId].put')

beforeEach(() => {
  user = { id: 'staff-001', role: 'staff' }
  appointmentStatus = 'COMPLETED'
  body = {
    status: 'submitted', ratings,
    observations: 'พร้อมดูแล', companyRequirements: 'นักศึกษาพัฒนาเว็บ', issues: '', suggestions: '',
  }
  vi.clearAllMocks()
})

describe('company evaluation API', () => {
  it('allows staff to submit every requested company criterion', async () => {
    await expect(saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])).resolves.toMatchObject({ status: 'submitted' })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { appointmentId_evaluatorId: { appointmentId: 'APPOINTMENT-1', evaluatorId: 'staff-001' } },
      create: expect.objectContaining({ evaluatorId: 'staff-001', environmentScore: 4, allowanceScore: 3, nearbyAccommodationScore: 4, companyRequirements: 'นักศึกษาพัฒนาเว็บ' }),
    }))
  })

  it('stores one company evaluation per evaluator for the same appointment', async () => {
    user = { id: 'lecturer-001', role: 'lecturer' }
    await saveCompanyEvaluation({} as Parameters<typeof saveCompanyEvaluation>[0])
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { appointmentId_evaluatorId: { appointmentId: 'APPOINTMENT-1', evaluatorId: 'lecturer-001' } },
    }))
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'COMPANY_EVALUATION_SUBMITTED',
        recipients: { create: [{ accountId: 'staff-001' }] },
      }),
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
