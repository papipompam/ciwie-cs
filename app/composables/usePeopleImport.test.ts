import { File } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { toPeopleWorksheetRows, toTemporaryCredentialWorksheetRows, usePeopleImport } from './usePeopleImport'
import type { PersonRecord } from './usePeopleDirectory'

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
      รหัส: '66123456701',
      คำนำหน้าชื่อ: 'นาย',
      ชื่อ: 'ธนกฤต',
      นามสกุล: 'พูนทรัพย์',
      เบอร์โทร: '0812345601',
      อีเมล: 'thanakrit@example.ac.th',
      รอบสหกิจ: 'ภาคเรียนที่ 2/2569',
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
