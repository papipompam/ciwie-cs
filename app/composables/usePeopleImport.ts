import { z } from 'zod'
import { getStudentCohortYear } from './useStudentCohortContext'
import { getStudentPlacementPosition, personPrefixOptions, personPrefixValues } from './usePeopleDirectory'
import type { PersonPrefix, PersonRecord, PersonType } from './usePeopleDirectory'

export type PeopleFileFormat = 'csv' | 'xlsx'
export type ImportRowStatus = 'new' | 'update' | 'invalid'

export interface PeopleImportRow {
  rowNumber: number
  id: string
  prefix: PersonPrefix | ''
  firstName: string
  lastName: string
  status: ImportRowStatus
  reason: string
}

const rowSchema = z.object({
  id: z.string().trim().min(1, 'ไม่พบรหัส'),
  prefix: z.enum(personPrefixValues, { error: 'ไม่พบหรือคำนำหน้าไม่ถูกต้อง' }),
  firstName: z.string().trim().min(1, 'ไม่พบชื่อ'),
  lastName: z.string().trim().min(1, 'ไม่พบนามสกุล'),
})

const getHeaders = (type: PersonType) => ({
  id: type === 'student' ? 'รหัสนักศึกษา' : 'รหัสอาจารย์',
  prefix: 'คำนำหน้า',
  firstName: 'ชื่อ',
  lastName: 'นามสกุล',
})

const parseCsvRows = (value: string) => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let quoted = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? ''
    const nextCharacter = value[index + 1] ?? ''
    if (character === '"' && quoted && nextCharacter === '"') {
      currentCell += '"'
      index += 1
    }
    else if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) {
      currentRow.push(currentCell)
      currentCell = ''
    }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
    }
    else currentCell += character
  }
  currentRow.push(currentCell)
  rows.push(currentRow)
  return rows.filter(row => row.some(cell => cell.trim()))
}

const matrixToRecords = (matrix: unknown[][]) => {
  const headers = (matrix[0] ?? []).map(value => String(value ?? '').trim())
  return matrix.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

const escapeCsvCell = (value: string | number) => {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const readCell = (row: Record<string, unknown>, aliases: string[]) => {
  const entry = Object.entries(row).find(([key]) => aliases.includes(key.replace(/^\uFEFF/, '').trim().toLocaleLowerCase('th')))
  return entry ? String(entry[1] ?? '').trim() : ''
}

export const toPeopleWorksheetRows = (people: PersonRecord[], type: PersonType) => {
  return people
    .filter(person => person.type === type)
    .map<Record<string, string | number>>((person) => {
      if (type === 'student') {
        const studentRow: Record<string, string | number> = {
          รหัส: person.id,
          คำนำหน้าชื่อ: person.prefix,
          ชื่อ: person.firstName,
          นามสกุล: person.lastName,
          รุ่น: getStudentCohortYear(person.id),
          หมู่เรียน: person.section ?? '',
          สถานประกอบการ: person.company ?? '',
          ตำแหน่งที่ฝึก: getStudentPlacementPosition(person.id, person.company),
        }
        return studentRow
      }
      const lecturerRow: Record<string, string | number> = {
        รหัส: person.id,
        คำนำหน้าชื่อ: person.prefix,
        ชื่อ: person.firstName,
        นามสกุล: person.lastName,
      }
      return lecturerRow
    })
}

export const usePeopleImport = () => {
  const parseFile = async (file: File, type: PersonType, existingIds: Set<string>): Promise<PeopleImportRow[]> => {
    const isCsv = file.name.toLocaleLowerCase().endsWith('.csv')
    const matrix = isCsv
      ? parseCsvRows(await file.text())
      : await import('read-excel-file/browser').then(({ readSheet }) => readSheet(file))
    const rawRows = matrixToRecords(matrix)
    if (!rawRows.length) throw new Error('empty-workbook')

    const idAliases = type === 'student'
      ? ['รหัสนักศึกษา', 'student id', 'student_id', 'id']
      : ['รหัสอาจารย์', 'lecturer id', 'lecturer_id', 'id']
    const normalized = rawRows.map((row, index) => ({
      rowNumber: index + 2,
      id: readCell(row, idAliases),
      prefix: readCell(row, ['คำนำหน้า', 'prefix', 'title']) as PersonPrefix | '',
      firstName: readCell(row, ['ชื่อ', 'first name', 'first_name', 'firstname']),
      lastName: readCell(row, ['นามสกุล', 'last name', 'last_name', 'lastname']),
    }))
    const idCounts = normalized.reduce<Map<string, number>>((counts, row) => {
      if (row.id) counts.set(row.id, (counts.get(row.id) ?? 0) + 1)
      return counts
    }, new Map())

    return normalized.map((row) => {
      const result = rowSchema.safeParse(row)
      if (!result.success) {
        return {
          ...row,
          status: 'invalid' as const,
          reason: result.error.issues.map(issue => issue.message).join(', '),
        }
      }
      if (!personPrefixOptions[type].some(option => option.value === row.prefix)) {
        return { ...row, status: 'invalid' as const, reason: `คำนำหน้าไม่เหมาะกับข้อมูล${type === 'student' ? 'นักศึกษา' : 'อาจารย์'}` }
      }
      if ((idCounts.get(row.id) ?? 0) > 1) {
        return { ...row, status: 'invalid' as const, reason: 'รหัสซ้ำมากกว่าหนึ่งแถวภายในไฟล์' }
      }
      if (existingIds.has(row.id)) {
        return { ...row, status: 'update' as const, reason: 'พบรหัสเดิมในระบบ จะอัปเดตคำนำหน้าและชื่อ–นามสกุลโดยคงบัญชีเดิม' }
      }
      return { ...row, status: 'new' as const, reason: 'ข้อมูลครบถ้วน พร้อมสร้างข้อมูลและบัญชีใหม่' }
    })
  }

  const downloadWorkbook = async (
    rows: Record<string, string | number>[],
    fileName: string,
    format: PeopleFileFormat,
  ) => {
    const headers = Object.keys(rows[0] ?? {})
    const matrix = [headers, ...rows.map(row => headers.map(header => row[header] ?? ''))]
    if (format === 'xlsx') {
      const { default: writeExcelFile } = await import('write-excel-file/browser')
      const sheetData = matrix.map(row => row.map(value => ({ value })))
      await writeExcelFile(sheetData).toFile(`${fileName}.xlsx`)
      return
    }
    const content = `\uFEFF${matrix.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${fileName}.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const downloadTemplate = async (type: PersonType, format: PeopleFileFormat) => {
    const headers = getHeaders(type)
    await downloadWorkbook([{
      [headers.id]: type === 'student' ? '66123456789' : 'L0099',
      [headers.prefix]: type === 'student' ? 'นางสาว' : 'อาจารย์',
      [headers.firstName]: 'ตัวอย่าง',
      [headers.lastName]: 'ข้อมูล',
    }], `${type === 'student' ? 'student' : 'lecturer'}-import-template`, format)
  }

  const exportPeople = async (people: PersonRecord[], type: PersonType, format: PeopleFileFormat) => {
    await downloadWorkbook(toPeopleWorksheetRows(people, type), `${type === 'student' ? 'students' : 'lecturers'}-export`, format)
  }

  const downloadInvalidRows = async (rows: PeopleImportRow[], type: PersonType) => {
    const headers = getHeaders(type)
    await downloadWorkbook(rows.filter(row => row.status === 'invalid').map(row => ({
      แถว: row.rowNumber,
      [headers.id]: row.id,
      [headers.prefix]: row.prefix,
      [headers.firstName]: row.firstName,
      [headers.lastName]: row.lastName,
      เหตุผล: row.reason,
    })), `${type === 'student' ? 'student' : 'lecturer'}-import-errors`, 'csv')
  }

  return { parseFile, downloadTemplate, exportPeople, downloadInvalidRows }
}
