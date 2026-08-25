import { describe, expect, it } from 'vitest'
import { applicationTransitionSchema, createApplicationSchema } from '../../shared/schemas/application'
import { profileUpdateSchema } from '../../shared/schemas/admin-identity'
import { evaluationTemplateCreateSchema } from '../../shared/schemas/evaluation-template'
import { organizationCreateSchema, workSiteCreateSchema } from '../../shared/schemas/organization'
import { normalizeOrganizationName } from '../../server/services/organization-service'

describe('feature-gap strict schemas', () => {
  it('rejects unknown organization and profile fields', () => {
    expect(organizationCreateSchema.safeParse({ nameTh: 'บริษัท ทดสอบ', role: 'ADMIN' }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ email: 'student@example.com', status: 'ACTIVE' }).success).toBe(false)
  })

  it('requires a valid Thai postal code when supplied', () => {
    const base = { organizationId: '123e4567-e89b-12d3-a456-426614174000', name: 'สำนักงานใหญ่', addressLine: '1 ถนนทดสอบ', province: 'กรุงเทพมหานคร', region: 'ภาคกลาง' }
    expect(workSiteCreateSchema.safeParse({ ...base, postalCode: '10110' }).success).toBe(true)
    expect(workSiteCreateSchema.safeParse({ ...base, postalCode: '1011' }).success).toBe(false)
  })

  it('requires the application position/date and bounds unique evidence files', () => {
    const base = { studentTermId: 'student-term-1', workSiteId: 'site-1', positionTitle: 'Developer', appliedAt: '2026-08-01' }
    expect(createApplicationSchema.safeParse(base).success).toBe(true)
    expect(createApplicationSchema.safeParse({ ...base, appliedAt: '01/08/2026' }).success).toBe(false)
    expect(createApplicationSchema.safeParse({ ...base, evidenceFileVersionIds: ['file-1', 'file-1'] }).success).toBe(false)
    expect(createApplicationSchema.safeParse({ ...base, evidenceFileVersionIds: Array.from({ length: 11 }, (_, index) => `file-${index}`) }).success).toBe(false)
  })

  it('validates optional application transition occurrence data and evidence bounds', () => {
    const base = { to: 'WAITING_RESPONSE', expectedVersion: 1, occurredAt: '2026-08-20', note: 'ได้รับการตอบกลับ' }
    expect(applicationTransitionSchema.safeParse({ ...base, evidenceFileVersionIds: ['file-1'] }).success).toBe(true)
    expect(applicationTransitionSchema.safeParse({ ...base, occurredAt: '20/08/2026' }).success).toBe(false)
    expect(applicationTransitionSchema.safeParse({ ...base, evidenceFileVersionIds: ['file-1', 'file-1'] }).success).toBe(false)
  })

  it('validates score item semantics and duplicate item codes', () => {
    const base = { code: 'STUDENT_V1', subject: 'STUDENT', name: 'แบบประเมินนักศึกษา' }
    expect(evaluationTemplateCreateSchema.safeParse({ ...base, items: [{ code: 'Q1', label: 'คะแนน', answerType: 'SCORE', maxScore: 5 }] }).success).toBe(true)
    expect(evaluationTemplateCreateSchema.safeParse({ ...base, items: [{ code: 'Q1', label: 'คะแนน', answerType: 'SCORE' }] }).success).toBe(false)
    expect(evaluationTemplateCreateSchema.safeParse({ ...base, items: [{ code: 'Q1', label: 'หนึ่ง', answerType: 'TEXT' }, { code: 'q1', label: 'สอง', answerType: 'TEXT' }] }).success).toBe(false)
  })

  it('normalizes Unicode and repeated whitespace for duplicate suggestions', () => {
    expect(normalizeOrganizationName('  บริษัท   ทดสอบ  จำกัด ')).toBe(normalizeOrganizationName('บริษัท ทดสอบ จำกัด'))
  })
})
