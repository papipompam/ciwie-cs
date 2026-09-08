import { File } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { toPeopleWorksheetRows, usePeopleImport } from './usePeopleImport'
import type { PersonRecord } from './usePeopleDirectory'

describe('usePeopleImport', () => {
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

  it('ส่งออกข้อมูลนักศึกษาครบทุกข้อมูลหลักโดยไม่รวมข้อมูลยืนยันตัวตน', () => {
    const student: PersonRecord = {
      id: '66123456701',
      type: 'student',
      prefix: 'นาย',
      firstName: 'ธนกฤต',
      lastName: 'พูนทรัพย์',
      recordStatus: 'active',
      accountStatus: 'first-login',
      cycle: 'ภาคเรียนที่ 2/2569',
      section: 'หมู่ 1',
      company: 'บริษัท สยามเทค โซลูชัน จำกัด',
      activities: [],
    }

    expect(toPeopleWorksheetRows([student], 'student')).toEqual([{
      รหัส: '66123456701',
      คำนำหน้าชื่อ: 'นาย',
      ชื่อ: 'ธนกฤต',
      นามสกุล: 'พูนทรัพย์',
      รุ่น: '2566',
      หมู่เรียน: 'หมู่ 1',
      สถานประกอบการ: 'บริษัท สยามเทค โซลูชัน จำกัด',
      ตำแหน่งที่ฝึก: 'Frontend Developer',
    }])
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
