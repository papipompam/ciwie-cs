import { File } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { toPeopleWorksheetRows, toTemporaryCredentialWorksheetRows, usePeopleImport } from './usePeopleImport'
import type { PersonRecord } from './usePeopleDirectory'

vi.mock('read-excel-file/browser', () => ({
  readSheet: async (file: File) => [{
    sheet: 'Sheet1',
    data: file.name === 'students-multi-header.xlsx'
      ? [
          [null, null, null, null, 'ตำแหน่งงาน', 'ชื่อสถานประกอบการ', 'ข้อมูลสถานประกอบการ', null, 'สถานะ'],
          [null, null, null, null, null, null, 'ส่งถึง', 'ที่อยู่', 'แบบตอบรับ'],
          [1, 660112230001, 'นาย', 'กฤษฎา ศรีภา', 'Frontend Developer', 'บริษัท ไอบอทน้อย จำกัด', null, null, false],
          [2, 660112230002, 'นาย', 'กิตติธัช ผุยโพนทัน', null, null, null, null, false],
          [null, null, null, null, null, null, null, null, null],
          [1, 660112230037, 'นาย', 'กิตติศักดิ์ พรมจิตต์', 'Frontend Developer', 'บริษัท ไอบอทน้อย จำกัด', null, null, false],
        ]
      : [
          ['รหัส', 'คำนำหน้าชื่อ', 'ชื่อ', 'นามสกุล', 'รุ่น', 'หมู่เรียน'],
          [660112230062, 'นางสาว', 'ชลธิชา', 'ศรีเชื้อ', 2566, 'หมู่ 2'],
        ],
  }],
}))

describe('usePeopleImport', () => {
  it('เตรียมข้อมูลรหัสผ่านชั่วคราวสำหรับส่งออก Excel โดยระบุสถานะครั้งแรก', () => {
    expect(toTemporaryCredentialWorksheetRows([{ username: '66123456888', name: 'นางสาว ทดสอบ นำเข้า', temporaryPassword: 'Abc234567890XYZ' }])).toEqual([{
      รหัสผู้ใช้: '66123456888',
      ชื่อ: 'นางสาว ทดสอบ นำเข้า',
      รหัสผ่านชั่วคราว: 'Abc234567890XYZ',
      สถานะบัญชี: 'FIRST_LOGIN',
    }])
  })

  it('แยกรายการใหม่ ข้อมูลเดิม และรหัสซ้ำในไฟล์ได้ถูกต้อง', async () => {
    const csv = [
      'รหัสนักศึกษา,คำนำหน้า,ชื่อ,นามสกุล',
      '66123456701,นาย,ธนกฤต,พูนทรัพย์ใหม่',
      '66123456888,นางสาว,ทดสอบ,นำเข้า',
      '66123456889,นาย,ข้อมูล,ซ้ำ',
      '66123456889,นาย,ข้อมูล,ซ้ำอีกครั้ง',
      '66123456890,นาย,ชื่อไม่มี,',
    ].join('\n')
    const file = new File([csv], 'students.csv', { type: 'text/csv' }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set(['66123456701']))

    expect(rows.map(row => row.status)).toEqual(['update', 'new', 'invalid', 'invalid', 'invalid'])
    expect(rows[2]?.reason).toContain('รหัสซ้ำ')
    expect(rows[4]?.reason).toContain('ไม่พบนามสกุล')
  })

  it('อ่านหัวตารางจากไฟล์ส่งออกเดิมพร้อมรายละเอียดการติดต่อและรอบสหกิจได้', async () => {
    const csv = [
      'รายชื่อนักศึกษาประจำรอบ',
      'รหัส,คำนำหน้าชื่อ,ชื่อ,นามสกุล,เบอร์โทร,อีเมล,รอบสหกิจ,หมู่เรียน',
      '66123456701,นาย,ธนกฤต,พูนทรัพย์,0812345601,thanakrit@example.ac.th,ภาคเรียนที่ 2/2569,หมู่ 1',
    ].join('\n')
    const file = new File([csv], 'students-export.csv', { type: 'text/csv' }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set())

    expect(rows[0]).toMatchObject({
      rowNumber: 3, id: '66123456701', prefix: 'นาย', phone: '0812345601', email: 'thanakrit@example.ac.th',
      cycle: 'ภาคเรียนที่ 2/2569', section: 'หมู่ 1', status: 'new',
    })
  })

  it('รองรับไฟล์ที่ไม่มีคำนำหน้าและใช้ชื่อกับนามสกุลแยกคอลัมน์', async () => {
    const csv = [
      'รหัสนักศึกษา,ชื่อ,นามสกุล,สถานะข้อมูล',
      '66123456701,ธนกฤต,พูนทรัพย์,ใช้งาน',
    ].join('\n')
    const file = new File([csv], 'students-without-prefix.csv', { type: 'text/csv' }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set())

    expect(rows[0]).toMatchObject({ id: '66123456701', prefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์', status: 'new' })
  })

  it('แยกชื่อเต็มจากคอลัมน์ชื่อเมื่อไฟล์ไม่มีคอลัมน์นามสกุล', async () => {
    const csv = [
      'รหัส,คำนำหน้าชื่อ,ชื่อ,รุ่น,หมู่เรียน',
      '650112230002,นาย,ก่อกุศล บาลวรเศรษฐ์,2565,หมู่ 1',
    ].join('\n')
    const file = new File([csv], 'students-full-name.csv', { type: 'text/csv' }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set())

    expect(rows[0]).toMatchObject({ id: '650112230002', firstName: 'ก่อกุศล', lastName: 'บาลวรเศรษฐ์', status: 'new' })
  })

  it('อ่านข้อมูลจากรูปแบบผลลัพธ์ Excel ที่มี sheet และ data ได้', async () => {
    const file = new File(['excel-binary-placeholder'], 'students.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set())

    expect(rows[0]).toMatchObject({ id: '660112230062', firstName: 'ชลธิชา', lastName: 'ศรีเชื้อ', cohortYear: 2566, status: 'new' })
  })

  it('อ่านไฟล์ Excel ที่มีหัวตารางหลายแถวและแถวว่างคั่นกลุ่มข้อมูลได้', async () => {
    const file = new File(['excel-binary-placeholder'], 'students-multi-header.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set())

    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.id)).toEqual(['660112230001', '660112230002', '660112230037'])
    expect(rows[0]).toMatchObject({ prefix: 'นาย', firstName: 'กฤษฎา', lastName: 'ศรีภา', status: 'new' })
  })

  it('อ่านไฟล์รูปแบบใหม่ที่ใช้ชื่อเต็ม ตำแหน่งงาน และสถานประกอบการได้', async () => {
    const csv = [
      'เลขลำดับ,รหัสนักศึกษา,คำนำหน้า,ชื่อ-นามสกุล,ตำแหน่งงาน,ชื่อสถานประกอบการ',
      '1,66123456701,นาย,ธนกฤต พูนทรัพย์,Frontend Developer,บริษัท ตัวอย่าง จำกัด',
    ].join('\n')
    const file = new File([csv], 'students-new-format.csv', { type: 'text/csv' }) as unknown as globalThis.File
    const { parseFile } = usePeopleImport()

    const rows = await parseFile(file, 'student', new Set())

    expect(rows[0]).toMatchObject({
      id: '66123456701', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์', position: 'Frontend Developer',
      company: 'บริษัท ตัวอย่าง จำกัด', status: 'new',
    })
  })

  it('ส่งออกข้อมูลนักศึกษาครบทุกข้อมูลหลักโดยไม่รวมข้อมูลยืนยันตัวตน', () => {
    const student: PersonRecord = {
      id: '66123456701',
      type: 'student',
      prefix: 'นาย',
      firstName: 'ธนกฤต',
      lastName: 'พูนทรัพย์',
      phone: '0812345601',
      email: 'thanakrit@example.ac.th',
      recordStatus: 'active',
      accountStatus: 'first-login',
      cycle: 'ภาคเรียนที่ 2/2569',
      section: 'หมู่ 1',
      company: 'บริษัท สยามเทค โซลูชัน จำกัด',
      activities: [],
    }

    expect(toPeopleWorksheetRows([student], 'student')).toEqual([{
      เลขลำดับ: 1,
      รหัสนักศึกษา: '66123456701',
      คำนำหน้า: 'นาย',
      'ชื่อ-นามสกุล': 'ธนกฤต พูนทรัพย์',
      ตำแหน่งงาน: 'Frontend Developer',
      ชื่อสถานประกอบการ: 'บริษัท สยามเทค โซลูชัน จำกัด',
    }])
  })

  it('เรียงไฟล์ส่งออกนักศึกษาตามหมู่เรียนและรหัสนักศึกษา', () => {
    const makeStudent = (id: string, section: 'หมู่ 1' | 'หมู่ 2'): PersonRecord => ({
      id,
      type: 'student',
      prefix: 'นาย',
      firstName: 'นักศึกษา',
      lastName: id,
      recordStatus: 'active',
      accountStatus: 'active',
      section,
      activities: [],
    })

    const rows = toPeopleWorksheetRows([
      makeStudent('66123456700', 'หมู่ 2'),
      makeStudent('66123456799', 'หมู่ 1'),
      makeStudent('66123456701', 'หมู่ 1'),
    ], 'student')

    expect(rows.map(row => row['รหัสนักศึกษา'])).toEqual(['66123456701', '66123456799', '66123456700'])
  })

  it('ส่งออกข้อมูลอาจารย์เฉพาะรหัสและชื่อครบทุกส่วน', () => {
    const lecturer: PersonRecord = {
      id: 'L0012',
      type: 'lecturer',
      prefix: 'ผศ.ดร.',
      firstName: 'สมชาย',
      lastName: 'ใจมั่น',
      recordStatus: 'active',
      accountStatus: 'active',
      activities: [],
    }

    expect(toPeopleWorksheetRows([lecturer], 'lecturer')).toEqual([{
      รหัส: 'L0012',
      คำนำหน้าชื่อ: 'ผศ.ดร.',
      ชื่อ: 'สมชาย',
      นามสกุล: 'ใจมั่น',
    }])
  })
})
