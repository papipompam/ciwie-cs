import { beforeEach, describe, expect, it, vi } from 'vitest'

let currentUser = { id: 'staff-001', role: 'staff' as 'staff' | 'lecturer' }
let query: Record<string, string> = { format: 'csv', cycleId: 'CYCLE-1' }
const evaluation = {
  responsibilityScore: 5, disciplineScore: 4, communicationScore: 3,
  knowledgeScore: 4, workQualityScore: 5, problemSolvingScore: 3,
  appointmentStudent: { placementRequest: {
    companyNameSnapshot: 'บริษัททดสอบ', positionTitle: 'Developer',
    enrollment: { student: { namePrefix: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ' } },
  } },
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => currentUser) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('setResponseHeader', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
const findMany = vi.fn(async () => [evaluation])
vi.stubGlobal('usePrisma', () => ({ studentEvaluation: { findMany } }))

const { default: exportStudentEvaluations } = await import('../server/api/evaluations/students/export.get')

beforeEach(() => {
  currentUser = { id: 'staff-001', role: 'staff' }
  query = { format: 'csv', cycleId: 'CYCLE-1' }
  vi.clearAllMocks()
})

describe('student evaluation export API', () => {
  it('returns a UTF-8 CSV with the requested identity, summary and criterion columns', async () => {
    const result = await exportStudentEvaluations({} as Parameters<typeof exportStudentEvaluations>[0])
    const csv = result.toString('utf8')
    expect(csv).toContain('ชื่อ-นามสกุล')
    expect(csv).toContain('สรุปผลคะแนน (เฉลี่ยเต็ม 5)')
    expect(csv).toContain('การเรียนรู้และแก้ไขปัญหา')
    expect(setResponseHeader).toHaveBeenCalledWith(expect.anything(), 'content-type', 'text/csv; charset=utf-8')
  })

  it('scopes lecturer exports to evaluations they created', async () => {
    currentUser = { id: 'lecturer-001', role: 'lecturer' }
    await exportStudentEvaluations({} as Parameters<typeof exportStudentEvaluations>[0])
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ evaluatorLecturerId: 'lecturer-001' }),
    }))
  })

  it('returns a valid XLSX archive when Excel is requested', async () => {
    query = { format: 'xlsx' }
    const result = await exportStudentEvaluations({} as Parameters<typeof exportStudentEvaluations>[0])
    expect(result.subarray(0, 2).toString('ascii')).toBe('PK')
    expect(setResponseHeader).toHaveBeenCalledWith(expect.anything(), 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })
})
