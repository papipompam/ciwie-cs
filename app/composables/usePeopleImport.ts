import { z } from 'zod'
import { getStudentCohortYear } from './useStudentCohortContext'
import { getStudentPlacementPosition, personPrefixOptions, personPrefixValues } from './usePeopleDirectory'
import type { PersonPrefix, PersonRecord, PersonType, StudentSection } from './usePeopleDirectory'

export type PeopleFileFormat = 'csv' | 'xlsx'
export type ImportRowStatus = 'new' | 'update' | 'invalid'

export interface PeopleImportRow {
  rowNumber: number
  id: string
  prefix: PersonPrefix | ''
  firstName: string
  lastName: string
  phone?: string
  email?: string
  cohortYear?: number
  cycle?: string
  section?: StudentSection
  note?: string
  status: ImportRowStatus
  reason: string
}

export interface PeopleImportCredential {
  username: string
  name: string
  temporaryPassword: string
}

const rowSchema = z.object({
  id: z.string().trim().min(1, 'ไม่พบรหัส'),
  prefix: z.enum(personPrefixValues, { error: 'ไม่พบหรือคำนำหน้าไม่ถูกต้อง' }),
  firstName: z.string().trim().min(1, 'ไม่พบชื่อ'),
  lastName: z.string().trim().min(1, 'ไม่พบนามสกุล'),
  phone: z.string().regex(/^[0-9+()\-\s]{8,30}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง').optional(),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').max(254).optional(),
  cycle: z.string().max(150, 'รอบสหกิจยาวเกินไป').optional(),
  section: z.enum(['หมู่ 1', 'หมู่ 2']).optional(),
})

const getHeaders = (type: PersonType) => ({
  id: type === 'student' ? 'รหัสนักศึกษา' : 'รหัสอาจารย์',
  prefix: 'คำนำหน้า',
  firstName: 'ชื่อ',
  lastName: 'นามสกุล',
  phone: 'เบอร์โทร',
  email: 'อีเมล',
  ...(type === 'student' ? { cycle: 'รอบสหกิจ', section: 'หมู่เรียน' } : {}),
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

const normalizeHeader = (value: string) => value
  .normalize('NFKC')
  .replace(/^\uFEFF/, '')
  .trim()
  .toLocaleLowerCase('th')
  .replace(/[^\p{L}\p{N}]+/gu, '')

const columnAliases = {
  id: ['รหัสนักศึกษา', 'รหัสนักเรียน', 'รหัสผู้เรียน', 'รหัสอาจารย์', 'รหัส', 'เลขประจำตัวนักศึกษา', 'student id', 'student code', 'student no', 'lecturer id', 'lecturer code', 'id'],
  prefix: ['คำนำหน้าชื่อ', 'คำนำหน้า', 'ยศ', 'prefix', 'title'],
  firstName: ['ชื่อจริง', 'ชื่อ', 'given name', 'first name', 'firstname'],
  lastName: ['นามสกุล', 'ชื่อสกุล', 'surname', 'last name', 'lastname'],
  phone: ['เบอร์โทรศัพท์', 'เบอร์โทร', 'เบอร์มือถือ', 'โทรศัพท์มือถือ', 'โทรศัพท์', 'มือถือ', 'โทร', 'phone number', 'phone', 'telephone', 'mobile phone', 'mobile'],
  email: ['อีเมลแอดเดรส', 'อีเมล', 'อีเมล์', 'email address', 'e-mail', 'email', 'mail'],
  cycle: ['รอบสหกิจศึกษา', 'รอบสหกิจ', 'รอบการฝึกงาน', 'รอบการศึกษา', 'ภาคการศึกษา', 'ภาคเรียน', 'semester', 'term', 'cycle', 'coop cycle'],
  cohortYear: ['รุ่นปีการศึกษา', 'รุ่นปี', 'รุ่น', 'ปีรุ่น', 'cohort year', 'cohort'],
  section: ['หมู่เรียนที่', 'หมู่เรียน', 'กลุ่มเรียน', 'กลุ่ม', 'ห้องเรียน', 'หมู่', 'section', 'class', 'group'],
} as const

const normalizedAliases = Object.fromEntries(Object.entries(columnAliases).map(([key, aliases]) => [key, aliases.map(normalizeHeader)])) as Record<keyof typeof columnAliases, string[]>

const matrixToRecords = (matrix: unknown[][]) => {
  const headerRowIndex = matrix.findIndex((row) => {
    const headers = row.map(value => normalizeHeader(String(value ?? '')))
    const has = (aliases: string[]) => aliases.some(alias => headers.includes(alias))
    return has(normalizedAliases.id) && has(normalizedAliases.firstName)
  })
  if (headerRowIndex < 0) throw new Error('missing-header')

  const headers = (matrix[headerRowIndex] ?? []).map((value, index) => {
    const header = String(value ?? '').trim()
    return header || `column-${index + 1}`
  })
  const records = matrix.slice(headerRowIndex + 1)
    .filter(row => row.some(cell => String(cell ?? '').trim()))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
  return { records, headerRowIndex }
}

const extractSheetMatrix = (value: unknown): unknown[][] => {
  if (!Array.isArray(value)) return []
  if (value.every(item => Array.isArray(item))) return value as unknown[][]
  const sheet = value.find((item): item is { data: unknown[][] } => (
    Boolean(item) && typeof item === 'object' && 'data' in item && Array.isArray(item.data)
  ))
  return sheet?.data ?? []
}

const escapeCsvCell = (value: string | number) => {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const readCell = (row: Record<string, unknown>, aliases: readonly string[]) => {
  const expected = aliases.map(normalizeHeader)
  const entry = Object.entries(row).find(([key]) => expected.includes(normalizeHeader(key)))
  return entry ? String(entry[1] ?? '').trim() : ''
}

const splitFullName = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return { firstName: value.trim(), lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' }
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
          ...(person.phone ? { เบอร์โทร: person.phone } : {}),
          ...(person.email ? { อีเมล: person.email } : {}),
          รุ่น: getStudentCohortYear(person.id),
          ...(person.cycle ? { รอบสหกิจ: person.cycle } : {}),
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
        ...(person.phone ? { เบอร์โทร: person.phone } : {}),
        ...(person.email ? { อีเมล: person.email } : {}),
      }
      return lecturerRow
    })
}

export const toTemporaryCredentialWorksheetRows = (credentials: PeopleImportCredential[]) => credentials.map(credential => ({
  รหัสผู้ใช้: credential.username,
  ชื่อ: credential.name,
  รหัสผ่านชั่วคราว: credential.temporaryPassword,
  สถานะบัญชี: 'FIRST_LOGIN',
}))

export const usePeopleImport = () => {
  const parseFile = async (file: File, type: PersonType, existingIds: Set<string>): Promise<PeopleImportRow[]> => {
    const isCsv = file.name.toLocaleLowerCase().endsWith('.csv')
    const matrix = isCsv
      ? parseCsvRows(await file.text())
      : extractSheetMatrix(await import('read-excel-file/browser').then(({ readSheet }) => readSheet(file)))
    const parsedMatrix = matrixToRecords(matrix)
    const rawRows = parsedMatrix.records
    if (!rawRows.length) throw new Error('empty-workbook')

    const idAliases = columnAliases.id
    const normalized = rawRows.map((row, index) => {
      const rawName = readCell(row, columnAliases.firstName)
      const rawLastName = readCell(row, columnAliases.lastName)
      const suppliedPrefix = readCell(row, columnAliases.prefix) as PersonPrefix | ''
      const embeddedPrefix = personPrefixValues.find(prefix => rawName.startsWith(`${prefix} `))
      const prefix = suppliedPrefix || embeddedPrefix || (type === 'student' ? 'นาย' : 'อาจารย์')
      const nameWithoutPrefix = embeddedPrefix ? rawName.slice(embeddedPrefix.length).trim() : rawName
      const splitName = rawLastName ? { firstName: nameWithoutPrefix, lastName: rawLastName } : splitFullName(nameWithoutPrefix)
      const notes = [
        !suppliedPrefix ? `ใช้คำนำหน้าเริ่มต้น ${prefix}` : '',
        !rawLastName && splitName.lastName ? 'แยกชื่อเต็มเป็นชื่อและนามสกุล' : '',
      ].filter(Boolean)
      return {
        rowNumber: parsedMatrix.headerRowIndex + index + 2,
        id: readCell(row, idAliases),
        prefix: prefix as PersonPrefix,
        firstName: splitName.firstName,
        lastName: splitName.lastName,
        phone: readCell(row, columnAliases.phone) || undefined,
        email: readCell(row, columnAliases.email) || undefined,
        cohortYear: (() => {
          const value = readCell(row, columnAliases.cohortYear)
          if (!value) return undefined
          const parsed = Number(value.replace(/[^0-9]/g, ''))
          return Number.isInteger(parsed) ? parsed : undefined
        })(),
        cycle: type === 'student' ? readCell(row, columnAliases.cycle) || undefined : undefined,
        section: type === 'student'
          ? ((() => {
              const value = readCell(row, columnAliases.section)
              if (!value) return undefined
              return (value.startsWith('หมู่ ') ? value : `หมู่ ${value}`) as StudentSection
            })())
          : undefined,
        note: notes.join(' · '),
      }
    })
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
        return { ...row, status: 'update' as const, reason: `พบรหัสเดิมในระบบ จะอัปเดตข้อมูลบุคคลโดยคงบัญชีเดิม${row.note ? ` · ${row.note}` : ''}` }
      }
      return { ...row, status: 'new' as const, reason: `ข้อมูลครบถ้วน พร้อมสร้างข้อมูลและบัญชีใหม่${row.note ? ` · ${row.note}` : ''}` }
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
      [headers.phone]: '0812345678',
      [headers.email]: 'example@example.ac.th',
      ...(type === 'student' ? { 'รอบสหกิจ': 'ภาคเรียนที่ 2/2569', 'หมู่เรียน': 'หมู่ 1' } : {}),
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

  const downloadTemporaryCredentials = async (credentials: PeopleImportCredential[], type: PersonType) => {
    await downloadWorkbook(
      toTemporaryCredentialWorksheetRows(credentials),
      `${type === 'student' ? 'students' : 'lecturers'}-temporary-passwords`,
      'xlsx',
    )
  }

  return { parseFile, downloadTemplate, exportPeople, downloadInvalidRows, downloadTemporaryCredentials }
}
