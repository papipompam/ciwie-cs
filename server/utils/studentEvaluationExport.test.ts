import { describe, expect, it } from 'vitest'
import { buildPersistedStudentEvaluationRows, rowsToCsv } from './studentEvaluationExport'

describe('persisted student evaluation export', () => {
  it('includes identity, placement, summary and every criterion', () => {
    const rows = buildPersistedStudentEvaluationRows([{
      responsibilityScore: 5, disciplineScore: 4, communicationScore: 3,
      knowledgeScore: 4, workQualityScore: 5, problemSolvingScore: 3,
      appointmentStudent: { placementRequest: {
        companyNameSnapshot: 'บริษัททดสอบ', positionTitle: 'Developer',
        enrollment: { student: { username: '66123456789', namePrefix: 'นาย', firstName: 'ทดสอบ', lastName: 'ระบบ' } },
      } },
    }])
    expect(rows[0]).toMatchObject({
      'รหัส': '66123456789',
      'ชื่อ-นามสกุล': 'นายทดสอบ ระบบ',
      'ตำแหน่ง': 'Developer',
      'สถานประกอบการ': 'บริษัททดสอบ',
      'สรุปผลคะแนน (เฉลี่ยเต็ม 5)': 4,
      'การเรียนรู้และแก้ไขปัญหา': 3,
    })
    expect(Object.keys(rows[0] ?? {}).slice(0, 5)).toEqual(['รหัส', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'สถานประกอบการ', 'สรุปผลคะแนน (เฉลี่ยเต็ม 5)'])
  })

  it('neutralizes spreadsheet formulas in CSV text', () => {
    const csv = rowsToCsv([{ 'ชื่อ-นามสกุล': '=HYPERLINK("bad")', 'คะแนน': 5 }])
    expect(csv).toContain("'=HYPERLINK")
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })
})
