import { describe, expect, it } from 'vitest'
import { loginSchema } from '../../shared/schemas/auth'
import { paginationSchema } from '../../shared/schemas/common'
import { responseDraftResultsSchema } from '../../shared/schemas/response'
import { visitScheduleSchema } from '../../shared/schemas/visit'

describe('strict request schemas', () => {
  it('accepts only normalized email login credentials', () => {
    expect(loginSchema.safeParse({ email: 'admin.demo@bru.ac.th', password: 'DemoAdmin@1234' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'demo.admin', password: 'DemoAdmin@1234' }).success).toBe(false)
    expect(loginSchema.parse({ email: ' Admin.Demo@BRU.AC.TH ', password: 'DemoAdmin@1234' }).email).toBe('admin.demo@bru.ac.th')
    expect(loginSchema.safeParse({ email: 'admin.demo@bru.ac.th', password: 'DemoAdmin@1234', identifier: 'admin' }).success).toBe(false)
  })

  it('rejects unknown fields and invalid pagination', () => {
    expect(paginationSchema.safeParse({ page: 1, pageSize: 25 }).success).toBe(false)
    expect(paginationSchema.safeParse({ page: 1, pageSize: 20, unexpected: true }).success).toBe(false)
  })

  it('rejects duplicate response members', () => {
    expect(responseDraftResultsSchema.safeParse({
      expectedVersion: 1,
      results: [
        { batchMemberId: 'member-1', result: 'ACCEPTED' },
        { batchMemberId: 'member-1', result: 'DECLINED' },
      ],
    }).success).toBe(false)
  })

  it('rejects duplicate visit membership', () => {
    expect(visitScheduleSchema.safeParse({
      coopTermId: 'term-1', workSiteId: 'site-1', round: 1, date: '2026-08-18', period: 'MORNING',
      studentTermIds: ['student-1', 'student-1'], lecturerIds: ['lecturer-1'],
    }).success).toBe(false)
  })
})
