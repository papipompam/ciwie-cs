import { describe, expect, it } from 'vitest'
import { summarizeStudentPlacements } from './studentPlacementSummary'
import type { PlacementRequestPreview } from '../../shared/placement-requests'

describe('student placement summary', () => {
  it('classifies every student once for the selected cycle', () => {
    const students = [{ id: 'S1', company: 'บริษัท ก' }, { id: 'S2' }, { id: 'S3' }, { id: 'S4' }]
    const request = (studentId: string, cycleId: string, status: PlacementRequestPreview['status']) => ({
      cycleId,
      status,
      application: { studentId },
    }) as Pick<PlacementRequestPreview, 'cycleId' | 'status' | 'application'>
    const result = summarizeStudentPlacements(students, [request('S2', 'C1', 'submitted'), request('S3', 'C1', 'confirmed'), request('S4', 'C2', 'submitted')], 'C1')
    expect(result).toEqual({ confirmed: 2, pending: 1, notStarted: 1, total: 4 })
  })

  it('handles no students and does not double count multiple requests', () => {
    expect(summarizeStudentPlacements([], [], 'C1')).toEqual({ confirmed: 0, pending: 0, notStarted: 0, total: 0 })
    const requests = ['submitted', 'returned'].map(status => ({ cycleId: 'C1', status, application: { studentId: 'S1' } })) as Array<Pick<PlacementRequestPreview, 'cycleId' | 'status' | 'application'>>
    expect(summarizeStudentPlacements([{ id: 'S1' }], requests, 'C1')).toEqual({ confirmed: 0, pending: 1, notStarted: 0, total: 1 })
  })
})
