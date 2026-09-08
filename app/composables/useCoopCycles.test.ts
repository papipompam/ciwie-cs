import { describe, expect, it } from 'vitest'
import { getSelectableCoopCycles } from './useCoopCycles'
import type { CoopCycle } from './useCoopCycles'

const cycle = (id: string, semester: string): CoopCycle => ({
  id,
  label: `${semester}/2569`,
  academicYear: '2569',
  semester,
  cohort: 'รุ่น 66',
  requestStart: '2026-08-01',
  requestEnd: '2026-09-30',
  trainingStart: '2026-11-02',
  trainingEnd: '2027-03-05',
  status: 'open',
})

describe('selectable cooperative education cycles', () => {
  it('แสดงเฉพาะภาคเรียนที่ 2 ในตัวกรองทั้งระบบ', () => {
    expect(getSelectableCoopCycles([
      cycle('CYCLE-2568-2', 'ภาคเรียนที่ 2'),
      cycle('CYCLE-2569-2', 'ภาคเรียนที่ 2'),
      cycle('CYCLE-2569-SUMMER', 'ภาคฤดูร้อน'),
      cycle('CYCLE-2570-1', 'ภาคเรียนที่ 1'),
      cycle('CYCLE-2570-2', 'ภาคเรียนที่ 2'),
    ]).map(item => item.id)).toEqual(['CYCLE-2568-2', 'CYCLE-2569-2', 'CYCLE-2570-2'])
  })
})
