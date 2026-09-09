import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'lecturer-001', role: 'lecturer' as 'lecturer' | 'staff' }
let assigned = true

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => user) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => 'APPOINTMENT-1')
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const findUnique = vi.fn(async () => ({
  id: 'APPOINTMENT-1',
  groupCompany: { group: { lecturers: assigned ? [{ lecturerId: 'lecturer-001' }] : [] } },
  lecturers: [],
  students: [
    {
      placementRequest: { enrollment: { student: { username: '66123456701' } } },
      studentEvaluations: [
        {
          evaluatorLecturerId: 'lecturer-001', status: 'SUBMITTED', submittedAt: new Date('2026-09-01T00:00:00.000Z'),
          responsibilityScore: 5, disciplineScore: 4, communicationScore: 3, knowledgeScore: 5,
          workQualityScore: 4, problemSolvingScore: 4, strengths: 'รับผิดชอบ', issues: null,
          suggestions: null, nextFollowUp: null,
        },
        {
          evaluatorLecturerId: 'lecturer-002', status: 'DRAFT', submittedAt: null,
          responsibilityScore: 1, disciplineScore: null, communicationScore: null, knowledgeScore: null,
          workQualityScore: null, problemSolvingScore: null, strengths: 'private draft', issues: null,
          suggestions: null, nextFollowUp: null,
        },
      ],
    },
  ],
  companyEvaluation: {
    evaluatorId: 'staff-001', status: 'SUBMITTED', submittedAt: new Date('2026-09-01T01:00:00.000Z'),
    workRelevanceScore: 5, workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 4,
    studentSupportScore: 5, environmentScore: 4, safetyScore: 5, resourceReadinessScore: 4,
    allowanceScore: 3, transportationScore: 4, publicTransportScore: 3, nearbyAccommodationScore: 4,
    universityCoordinationScore: 5, recommendation: 'RECOMMENDED', observations: 'พร้อมดูแล',
    companyRequirements: null, issues: null, suggestions: null,
  },
}))
vi.stubGlobal('usePrisma', () => ({ supervisionAppointment: { findUnique } }))

const { default: readEvaluations } = await import('../server/api/evaluations/appointments/[appointmentId].get')

beforeEach(() => {
  user = { id: 'lecturer-001', role: 'lecturer' }
  assigned = true
  vi.clearAllMocks()
})

describe('evaluation read API', () => {
  it('maps persisted scores and hides another lecturer draft', async () => {
    const result = await readEvaluations({} as Parameters<typeof readEvaluations>[0])
    expect(result.studentEvaluations).toEqual([
      expect.objectContaining({
        studentId: '66123456701', lecturerId: 'lecturer-001', status: 'submitted',
        ratings: expect.objectContaining({ responsibility: '5', ethics: '4', problem_solving: '4' }),
      }),
    ])
    expect(result.companyEvaluation).toMatchObject({
      evaluatorId: 'staff-001', status: 'submitted', recommendation: 'recommended',
      ratings: { field_relevance: '5', work_scope: '4', learning_opportunity: '5', supervisor_readiness: '4', student_support: '5', environment: '4', safety: '5', resources: '4', allowance: '3', transportation: '4', public_transport: '3', nearby_accommodation: '4', coordination: '5' },
    })
  })

  it('rejects an unassigned lecturer but lets staff inspect all drafts', async () => {
    assigned = false
    await expect(readEvaluations({} as Parameters<typeof readEvaluations>[0])).rejects.toMatchObject({ statusCode: 403 })
    user = { id: 'staff-001', role: 'staff' }
    const result = await readEvaluations({} as Parameters<typeof readEvaluations>[0])
    expect(result.studentEvaluations).toHaveLength(2)
  })
})
