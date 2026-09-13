import { beforeEach, describe, expect, it, vi } from 'vitest'

let query: Record<string, string> = { format: 'csv', cycleId: 'CYCLE-1' }
const evaluation = {
  workRelevanceScore: 5, workChallengeScore: 4, learningOpportunityScore: 5, supervisorReadinessScore: 4,
  studentSupportScore: 5, environmentScore: 4, safetyScore: 5, resourceReadinessScore: 4,
  allowanceScore: 3, transportationScore: 4, publicTransportScore: 3, nearbyAccommodationScore: 4, universityCoordinationScore: 5,
  evaluator: { namePrefix: 'อ.', firstName: 'ทดสอบ', lastName: 'ระบบ' },
  appointment: { appointmentNo: 'SV0001', scheduledDate: new Date('2026-09-14'), groupCompany: { group: { cycleId: 'CYCLE-1', round: 'ROUND_1' }, companySite: { branchName: 'สำนักงานใหญ่', company: { legalName: 'บริษัททดสอบ' } } } },
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => ({ id: 'staff-001', role: 'staff' })) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('setResponseHeader', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
const findMany = vi.fn(async () => [evaluation])
vi.stubGlobal('usePrisma', () => ({ companyEvaluation: { findMany } }))

const { default: exportCompanyEvaluations } = await import('../server/api/evaluations/companies/export.get')

beforeEach(() => {
  query = { format: 'csv', cycleId: 'CYCLE-1' }
  vi.clearAllMocks()
})

describe('company evaluation export API', () => {
  it('returns a UTF-8 CSV with the company summary and every criterion', async () => {
    const result = await exportCompanyEvaluations({} as Parameters<typeof exportCompanyEvaluations>[0])
    const csv = result.toString('utf8')
    const headers = csv.slice(1).split('\r\n')[0]
    expect(headers).toMatch(/^"วันที่นิเทศ","สถานประกอบการ","ผู้ประเมิน","สรุปผลคะแนน \(เฉลี่ยเต็ม 5\)"/)
    expect(headers).not.toContain('"เลขที่นัดนิเทศ"')
    expect(headers).not.toContain('"สาขา"')
    expect(csv).toContain('สรุปผลคะแนน (เฉลี่ยเต็ม 5)')
    expect(csv).toContain('การประสานงานและการสื่อสารกับมหาวิทยาลัยมีความชัดเจนและต่อเนื่อง')
    expect(setResponseHeader).toHaveBeenCalledWith(expect.anything(), 'content-type', 'text/csv; charset=utf-8')
  })

  it('returns a valid XLSX archive when Excel is requested', async () => {
    query = { format: 'xlsx' }
    const result = await exportCompanyEvaluations({} as Parameters<typeof exportCompanyEvaluations>[0])
    expect(result.subarray(0, 2).toString('ascii')).toBe('PK')
  })
})
