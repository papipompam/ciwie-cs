import { beforeEach, describe, expect, it, vi } from 'vitest'

const lecturer = { id: 'lecturer-001', role: 'lecturer' as const }
let appointmentStatus = 'COMPLETED'
let assigned = true
let body: Record<string, unknown> = {}
const completeRatings = { responsibility: 5, ethics: 4, communication: 4, knowledge: 5, work_quality: 4, problem_solving: 5 }

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => lecturer) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (_event: unknown, key: string) => key === 'appointmentId' ? 'APPOINTMENT-1' : '66123456701')
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
const upsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({ id: 'EVALUATION-1', ...create }))
const findFirst = vi.fn(async () => ({
  id: 'APPOINTMENT-STUDENT-1',
  appointment: {
    status: appointmentStatus,
    groupCompany: { group: { lecturers: assigned ? [{ lecturerId: lecturer.id }] : [] } },
    lecturers: [],
  },
  studentEvaluations: [],
}))
vi.stubGlobal('usePrisma', () => ({ supervisionAppointmentStudent: { findFirst }, studentEvaluation: { upsert } }))

const { default: saveStudentEvaluation } = await import('../server/api/evaluations/students/[appointmentId]/[studentId].put')

beforeEach(() => {
  appointmentStatus = 'COMPLETED'
  assigned = true
  body = { status: 'submitted', ratings: completeRatings, strengths: '', issues: '', suggestions: '', followUp: '' }
  vi.clearAllMocks()
})

describe('student evaluation API', () => {
  it('persists all six scores for an assigned lecturer', async () => {
    await expect(saveStudentEvaluation({} as Parameters<typeof saveStudentEvaluation>[0])).resolves.toMatchObject({ status: 'submitted' })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ evaluatorLecturerId: 'lecturer-001', responsibilityScore: 5, disciplineScore: 4, problemSolvingScore: 5 }),
    }))
  })

  it('rejects incomplete final scores and an unassigned lecturer', async () => {
    body = { ...body, ratings: { responsibility: 5 } }
    await expect(saveStudentEvaluation({} as Parameters<typeof saveStudentEvaluation>[0])).rejects.toMatchObject({ statusCode: 400 })
    body = { ...body, ratings: completeRatings }
    assigned = false
    await expect(saveStudentEvaluation({} as Parameters<typeof saveStudentEvaluation>[0])).rejects.toMatchObject({ statusCode: 403 })
  })

  it('requires a completed supervision appointment', async () => {
    appointmentStatus = 'PUBLISHED'
    await expect(saveStudentEvaluation({} as Parameters<typeof saveStudentEvaluation>[0])).rejects.toMatchObject({ statusCode: 409 })
  })
})
