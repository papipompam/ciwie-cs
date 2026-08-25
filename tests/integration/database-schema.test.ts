import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(resolve('prisma/schema.prisma'), 'utf8')
const migration = readFileSync(
  resolve('prisma/migrations/202608180001_initial/migration.sql'),
  'utf8',
)
const seed = readFileSync(resolve('prisma/seed.ts'), 'utf8')

describe('database invariants', () => {
  it('allows only one current placement per student term', () => {
    expect(schema).toMatch(/studentTermId\s+String\s+@unique[^\n]*@map\("student_term_id"\)/)
    expect(schema).toMatch(/sourceResponseResultId\s+String\s+@unique/)
  })

  it('reserves active supervision slots with database unique keys', () => {
    expect(schema).toContain('@@unique([studentTermId, round])')
    expect(schema).toContain('@@unique([studentTermId, visitDate, period])')
    expect(schema).toContain('@@unique([lecturerId, visitDate, period])')
    expect(schema).toContain('@@unique([workSiteId, visitDate, period])')
    expect(migration).toContain('visit_student_slots_schedule_fkey')
    expect(migration).toContain('visit_work_site_slots_schedule_fkey')
  })

  it('keeps request, batch, response member and scope identities consistent', () => {
    expect(schema).toContain('model DocumentBatchStudentSlot')
    expect(schema).toContain('@@unique([studentTermId, coopTermId, workSiteId])')
    expect(migration).toContain('batch_student_slots_scope_fkey')
    expect(migration).toContain('batch_members_request_scope_fkey')
    expect(migration).toContain('batch_members_batch_scope_fkey')
    expect(migration).toContain('response_results_form_batch_fkey')
    expect(migration).toContain('response_results_member_batch_fkey')
  })

  it('preserves immutable evaluation meaning and correction history', () => {
    expect(schema).toContain('itemSnapshot')
    expect(schema).toContain('model StudentEvaluationVersion')
    expect(schema).toContain('model OrganizationEvaluationVersion')
    expect(schema).toContain('@@unique([visitStudentId, templateId])')
    expect(schema).toContain('@@unique([visitId, templateId])')
    expect(migration).toContain('student_evaluations_version_template_fkey')
  })

  it('enforces non-negative, exact expense totals', () => {
    expect(schema).toMatch(/travelDays\s+Int/)
    expect(schema).toContain('@@index([visitId, round, createdAt])')
    expect(schema).not.toContain('@@unique([visitId, round])')
    expect(migration).toContain('`travel_days` SMALLINT UNSIGNED NOT NULL')
    expect(migration).not.toContain('expenses_visit_id_round_key')
    expect(schema).toMatch(/totalAmount\s+Decimal/)
    expect(migration).toContain('chk_expense_non_negative')
    expect(migration).toContain('chk_expense_total')
    expect(schema).toContain('model ExpenseVersion')
  })

  it('separates delivery assignment from recording the send details', () => {
    expect(schema).toMatch(/enum DeliveryStatus\s+{\s+ASSIGNED/)
    expect(schema).toMatch(/channel\s+String\?/)
    expect(schema).toMatch(/sentAt\s+DateTime\?/)
    expect(migration).toContain("ENUM('ASSIGNED', 'SENT', 'WAITING_RESPONSE', 'RESPONSE_RECEIVED')")
    expect(migration).toContain('`sent_at` DATETIME(3) NULL')
  })

  it('creates an initial admin once without overwriting it', () => {
    expect(seed).toContain('findUnique')
    expect(seed).toContain('Initial admin already exists; seed left the account unchanged.')
    expect(seed).not.toMatch(/prisma\.user\.(?:upsert|update)/)
  })
})
