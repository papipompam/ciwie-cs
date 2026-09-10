import { describe, expect, it } from 'vitest'
import { demoCompany, demoPlacementRequest, demoStudentApplication } from '../prisma/demo-data.mjs'

describe('demo seed workflow fixtures', () => {
  it('includes linked application and placement request data for the staff and student views', () => {
    expect(demoStudentApplication.id).toBeTruthy()
    expect(demoStudentApplication.enrollmentId).toBe('ENROLLMENT-001')
    expect(demoStudentApplication.status).toBe('COMPLETED')
    expect(demoPlacementRequest.studentApplicationId).toBe(demoStudentApplication.id)
    expect(demoPlacementRequest.enrollmentId).toBe(demoStudentApplication.enrollmentId)
    expect(demoPlacementRequest.status).toBe('SUBMITTED')
    expect(demoStudentApplication.companySiteId).toBe(demoCompany.companySiteId)
    expect(demoCompany.legalName).toContain('บุรีรัมย์')
  })
})
