import { describe, expect, it } from 'vitest'
import { deliveryAssignmentSchema, deliverySendSchema, expenseCorrectionSchema, expenseSchema } from '../../shared/schemas/commands'

describe('expense command schemas', () => {
  it('requires a positive integer travel day count when creating an expense', () => {
    const base = { visitId: 'visit-1', round: 1, travelAmount: 100, lodgingAmount: 200, mealAmount: 50 }
    expect(expenseSchema.safeParse({ ...base, travelDays: 2 }).success).toBe(true)
    expect(expenseSchema.safeParse({ ...base, travelDays: 0 }).success).toBe(false)
    expect(expenseSchema.safeParse({ ...base, travelDays: 1.5 }).success).toBe(false)
  })

  it('separates immutable identity from correction values and requires version and reason', () => {
    const correction = { expectedVersion: 1, reason: 'Correct receipt', travelDays: 2, travelAmount: 100, lodgingAmount: 200, mealAmount: 50 }
    expect(expenseCorrectionSchema.safeParse(correction).success).toBe(true)
    expect(expenseCorrectionSchema.safeParse({ ...correction, visitId: 'visit-other' }).success).toBe(false)
    expect(expenseCorrectionSchema.safeParse({ ...correction, reason: '' }).success).toBe(false)
  })
})

describe('delivery command schemas', () => {
  it('keeps assignment distinct from recording a send', () => {
    expect(deliveryAssignmentSchema.safeParse({ ownerType: 'STUDENT', ownerUserId: 'student-user', reason: 'Default owner' }).success).toBe(true)
    expect(deliveryAssignmentSchema.safeParse({ ownerType: 'STUDENT', ownerUserId: 'student-user' }).success).toBe(false)
    expect(deliveryAssignmentSchema.safeParse({ ownerType: 'STUDENT', ownerUserId: 'student-user', reason: 'Default owner', channel: 'EMAIL' }).success).toBe(false)
    expect(deliverySendSchema.safeParse({ channel: 'EMAIL', recipient: 'hr@example.com', sentAt: '2026-08-24T02:00:00.000Z' }).success).toBe(true)
    expect(deliverySendSchema.safeParse({ channel: 'EMAIL', recipient: '', sentAt: '2026-08-24T02:00:00.000Z' }).success).toBe(false)
  })
})
