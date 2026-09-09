import { describe, expect, it } from 'vitest'
import { buildPersistedStudentEvaluationRows, rowsToCsv } from './studentEvaluationExport'

describe('persisted student evaluation export', () => {
  it('includes identity, placement, summary and every criterion', () => {
    const rows = buildPersistedStudentEvaluationRows([{
      responsibilityScore: 5, disciplineScore: 4, communicationScore: 3,
      knowledgeScore: 4, workQualityScore: 5, problemSolvingScore: 3,
      appointmentStudent: { placementRequest: {
        companyNameSnapshot: 'บริษัททดสอบ', positionTitle: 'Developer',
        enrollment: { student: { namePrefix: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ' } },
      } },
    }])
    expect(rows[0]).toMatchObject({
      'ชื่อ-นามสกุล': 'นายทดสอบ ระบบ',
      'ตำแหน่งงาน': 'Developer',
      'ชื่อสถานประกอบการ': 'บริษัททดสอบ',
      'สรุปผลคะแนน (เฉลี่ยเต็ม 5)': 4,
      'การเรียนรู้และแก้ไขปัญหา': 3,
    })
  })

  it('neutralizes spreadsheet formulas in CSV text', () => {
    const csv = rowsToCsv([{ 'ชื่อ-นามสกุล': '=HYPERLINK("bad")', 'คะแนน': 5 }])
    expect(csv).toContain("'=HYPERLINK")
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })
})
