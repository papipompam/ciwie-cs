import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseStudentWorkbook } from '../../server/services/student-import-service'

describe('student workbook parser', () => {
  it('parses bounded CSV rows', async () => {
    const bytes = new TextEncoder().encode('studentCode,firstNameTh,lastNameTh,email\n65000001,สมชาย,ใจดี,test@example.com\n')
    await expect(parseStudentWorkbook(bytes, '.csv')).resolves.toEqual([
      { studentCode: '65000001', firstNameTh: 'สมชาย', lastNameTh: 'ใจดี', email: 'test@example.com' },
    ])
  })

  it('rejects formulas in CSV', async () => {
    const bytes = new TextEncoder().encode('studentCode,firstNameTh,lastNameTh\n65000001,=HYPERLINK("https://example.com"),ใจดี\n')
    await expect(parseStudentWorkbook(bytes, '.csv')).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('rejects formulas in XLSX', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Students')
    sheet.addRow(['studentCode', 'firstNameTh', 'lastNameTh'])
    sheet.addRow(['65000001', { formula: '1+1', result: 2 }, 'ใจดี'])
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
    await expect(parseStudentWorkbook(bytes, '.xlsx')).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})
