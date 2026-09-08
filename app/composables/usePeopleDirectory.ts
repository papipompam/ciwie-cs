export type PersonType = 'student' | 'lecturer'
export const personPrefixValues = ['นาย', 'นาง', 'นางสาว', 'อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'] as const
export type PersonPrefix = typeof personPrefixValues[number]
export type PersonRecordStatus = 'active' | 'inactive'
export type AccountStatus = 'first-login' | 'active' | 'suspended' | 'terminated'
export const studentSectionValues = ['หมู่ 1', 'หมู่ 2'] as const
export type StudentSection = typeof studentSectionValues[number]

export interface PersonActivity {
  id: string
  action: string
  detail: string
  actor: string
  occurredAt: string
}

export interface PersonRecord {
  id: string
  type: PersonType
  prefix: PersonPrefix
  firstName: string
  lastName: string
  recordStatus: PersonRecordStatus
  accountStatus: AccountStatus
  cycle?: string
  section?: StudentSection
  company?: string
  activities: PersonActivity[]
}

export interface PersonInput {
  id: string
  prefix: PersonPrefix
  firstName: string
  lastName: string
  cycle?: string
  section?: StudentSection
}

export type StudentApplicationStatus = 'submitted' | 'returned' | 'letter-issued' | 'confirmed' | 'cancelled'

export interface StudentApplicationHistory {
  id: string
  company: string
  position: string
  appliedAt: string
  status: StudentApplicationStatus
}

const initialPeople: PersonRecord[] = [
  {
    id: '66123456701',
    type: 'student',
    prefix: 'นาย',
    firstName: 'ธนกฤต',
    lastName: 'พูนทรัพย์',
    recordStatus: 'active',
    accountStatus: 'active',
    cycle: 'ภาคเรียนที่ 2/2569',
    section: 'หมู่ 1',
    company: 'บริษัท สยามเทค โซลูชัน จำกัด',
    activities: [
      { id: 'ACT-001', action: 'แก้ไขชื่อ', detail: 'ธนกิต → ธนกฤต', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-28T10:20:00+07:00' },
      { id: 'ACT-002', action: 'เข้าสู่ระบบสำเร็จ', detail: 'เข้าสู่ระบบด้วยบัญชีนักศึกษา', actor: 'นายธนกฤต พูนทรัพย์', occurredAt: '2026-08-30T08:42:00+07:00' },
    ],
  },
  {
    id: '66123456702',
    type: 'student',
    prefix: 'นางสาว',
    firstName: 'ณัฐชา',
    lastName: 'ศรีสุข',
    recordStatus: 'active',
    accountStatus: 'first-login',
    cycle: 'ภาคเรียนที่ 2/2569',
    section: 'หมู่ 1',
    company: 'บริษัท อีสานดิจิทัล จำกัด',
    activities: [{ id: 'ACT-003', action: 'สร้างข้อมูลและบัญชี', detail: 'รอเข้าสู่ระบบครั้งแรก', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-25T09:15:00+07:00' }],
  },
  {
    id: '65123456719',
    type: 'student',
    prefix: 'นาย',
    firstName: 'ปุณณภพ',
    lastName: 'วงศ์คำ',
    recordStatus: 'inactive',
    accountStatus: 'terminated',
    cycle: 'ภาคเรียนที่ 1/2568',
    section: 'หมู่ 2',
    company: 'บริษัท โคราชซอฟต์ จำกัด',
    activities: [{ id: 'ACT-004', action: 'ยุติการใช้งานข้อมูล', detail: 'ยุติบัญชีและคงประวัติเดิมไว้', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-05-10T14:30:00+07:00' }],
  },
  {
    id: '66123456704',
    type: 'student',
    prefix: 'นางสาว',
    firstName: 'ภัทรวดี',
    lastName: 'คำแสน',
    recordStatus: 'active',
    accountStatus: 'active',
    cycle: 'ภาคเรียนที่ 2/2569',
    section: 'หมู่ 2',
    activities: [{ id: 'ACT-007', action: 'สร้างข้อมูลและบัญชี', detail: 'สร้างจากการนำเข้าข้อมูล', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-20T11:25:00+07:00' }],
  },
  {
    id: '66123456708',
    type: 'student',
    prefix: 'นาย',
    firstName: 'ชยพล',
    lastName: 'พรมดี',
    recordStatus: 'active',
    accountStatus: 'active',
    cycle: 'ภาคเรียนที่ 2/2569',
    section: 'หมู่ 1',
    activities: [{ id: 'ACT-010', action: 'สร้างข้อมูลและบัญชี', detail: 'ยังไม่ได้ส่งคำร้องสถานประกอบการ', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-22T09:10:00+07:00' }],
  },
  {
    id: '66123456725',
    type: 'student',
    prefix: 'นางสาว',
    firstName: 'อรอนงค์',
    lastName: 'สายใจ',
    recordStatus: 'active',
    accountStatus: 'first-login',
    cycle: 'ภาคฤดูร้อน/2569',
    section: 'หมู่ 2',
    activities: [{ id: 'ACT-011', action: 'สร้างข้อมูลและบัญชี', detail: 'รอเข้าสู่ระบบครั้งแรก', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-29T11:00:00+07:00' }],
  },
  {
    id: '66123456746',
    type: 'student',
    prefix: 'นาย',
    firstName: 'วรพล',
    lastName: 'อินทร์แก้ว',
    recordStatus: 'active',
    accountStatus: 'active',
    cycle: 'ภาคฤดูร้อน/2569',
    section: 'หมู่ 1',
    activities: [{ id: 'ACT-012', action: 'สร้างข้อมูลและบัญชี', detail: 'ยังไม่ได้ส่งคำร้องสถานประกอบการ', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-29T11:20:00+07:00' }],
  },
  {
    id: '66123456750',
    type: 'student',
    prefix: 'นางสาว',
    firstName: 'พิชญาภา',
    lastName: 'วงศ์ดี',
    recordStatus: 'active',
    accountStatus: 'first-login',
    cycle: 'ภาคเรียนที่ 1/2570',
    section: 'หมู่ 2',
    activities: [{ id: 'ACT-013', action: 'สร้างข้อมูลและบัญชี', detail: 'รอเข้าสู่ระบบครั้งแรก', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-30T10:15:00+07:00' }],
  },
  {
    id: '67123456703',
    type: 'student',
    prefix: 'นาย',
    firstName: 'กฤตภาส',
    lastName: 'แสงแก้ว',
    recordStatus: 'active',
    accountStatus: 'active',
    cycle: 'ภาคเรียนที่ 1/2570',
    section: 'หมู่ 1',
    activities: [{ id: 'ACT-014', action: 'สร้างข้อมูลและบัญชี', detail: 'ยังไม่ได้ส่งคำร้องสถานประกอบการ', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-30T10:30:00+07:00' }],
  },
  {
    id: 'L0012',
    type: 'lecturer',
    prefix: 'ผศ.ดร.',
    firstName: 'สมชาย',
    lastName: 'ใจมั่น',
    recordStatus: 'active',
    accountStatus: 'active',
    activities: [{ id: 'ACT-005', action: 'เข้าสู่ระบบสำเร็จ', detail: 'เข้าสู่ระบบด้วยบัญชีอาจารย์', actor: 'ผศ.ดร.สมชาย ใจมั่น', occurredAt: '2026-08-30T07:55:00+07:00' }],
  },
  {
    id: 'L0018',
    type: 'lecturer',
    prefix: 'อาจารย์',
    firstName: 'อรทัย',
    lastName: 'บุญช่วย',
    recordStatus: 'active',
    accountStatus: 'suspended',
    activities: [{ id: 'ACT-006', action: 'ระงับบัญชีชั่วคราว', detail: 'ระงับการสร้าง Session ใหม่', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-27T16:10:00+07:00' }],
  },
  {
    id: 'L0021',
    type: 'lecturer',
    prefix: 'ดร.',
    firstName: 'กมลชนก',
    lastName: 'ศรีสวัสดิ์',
    recordStatus: 'active',
    accountStatus: 'active',
    activities: [{ id: 'ACT-008', action: 'สร้างข้อมูลและบัญชี', detail: 'บัญชีอาจารย์พร้อมใช้งาน', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-20T10:00:00+07:00' }],
  },
  {
    id: 'L0030',
    type: 'lecturer',
    prefix: 'อาจารย์',
    firstName: 'วรัญญา',
    lastName: 'ทองใบ',
    recordStatus: 'active',
    accountStatus: 'active',
    activities: [{ id: 'ACT-009', action: 'สร้างข้อมูลและบัญชี', detail: 'บัญชีอาจารย์พร้อมใช้งาน', actor: 'นางสาวพิมพ์ชนก ใจดี', occurredAt: '2026-08-18T13:45:00+07:00' }],
  },
]

const applicationHistory: Record<string, StudentApplicationHistory[]> = {
  '66123456701': [
    { id: 'REQ-2569-0142', company: 'บริษัท สยามเทค โซลูชัน จำกัด', position: 'Frontend Developer', appliedAt: '2026-08-18', status: 'confirmed' },
    { id: 'REQ-2569-0098', company: 'บริษัท ดิจิทัลโฟลว์ จำกัด', position: 'UX/UI Intern', appliedAt: '2026-07-30', status: 'cancelled' },
  ],
  '66123456702': [
    { id: 'REQ-2569-0151', company: 'บริษัท อีสานดิจิทัล จำกัด', position: 'Software Tester', appliedAt: '2026-08-20', status: 'letter-issued' },
  ],
  '65123456719': [
    { id: 'REQ-2568-0064', company: 'บริษัท โคราชซอฟต์ จำกัด', position: 'Backend Developer', appliedAt: '2025-06-12', status: 'confirmed' },
  ],
  '66123456704': [
    { id: 'REQ-2569-0160', company: 'บริษัท บุรีรัมย์เว็บ จำกัด', position: 'Web Developer', appliedAt: '2026-08-22', status: 'returned' },
  ],
}

export const getStudentPlacementPosition = (studentId: string, company?: string) => {
  if (!company) return ''
  return applicationHistory[studentId]?.find(application => application.company === company)?.position ?? ''
}

const cloneInitialPeople = () => initialPeople.map(person => ({
  ...person,
  activities: person.activities.map(activity => ({ ...activity })),
}))

export const personPrefixOptions: Record<PersonType, Array<{ value: PersonPrefix, label: string }>> = {
  student: ['นาย', 'นางสาว', 'นาง'].map(value => ({ value: value as PersonPrefix, label: value })),
  lecturer: ['อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'].map(value => ({ value: value as PersonPrefix, label: value })),
}

export const getPersonFullName = (person: Pick<PersonRecord, 'prefix' | 'firstName' | 'lastName'>) => `${person.prefix}${person.firstName} ${person.lastName}`

export const accountStatusMeta: Record<AccountStatus, { label: string, tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  'first-login': { label: 'รอเข้าสู่ระบบครั้งแรก', tone: 'warning' },
  active: { label: 'ใช้งาน', tone: 'success' },
  suspended: { label: 'ระงับชั่วคราว', tone: 'danger' },
  terminated: { label: 'ยุติการใช้งาน', tone: 'neutral' },
}

export const recordStatusMeta: Record<PersonRecordStatus, { label: string, tone: 'success' | 'neutral' }> = {
  active: { label: 'ใช้งาน', tone: 'success' },
  inactive: { label: 'ยุติการใช้งาน', tone: 'neutral' },
}

export const studentApplicationStatusMeta: Record<StudentApplicationStatus, { label: string, tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  submitted: { label: 'รอตรวจคำร้อง', tone: 'warning' },
  returned: { label: 'ส่งกลับแก้ไข', tone: 'danger' },
  'letter-issued': { label: 'ออกหนังสือแล้ว', tone: 'info' },
  confirmed: { label: 'ยืนยันสถานประกอบการแล้ว', tone: 'success' },
  cancelled: { label: 'ยกเลิกแล้ว', tone: 'neutral' },
}

export const usePeopleDirectory = () => {
  const people = useState<PersonRecord[]>('people-directory-v2', cloneInitialPeople)
  const { scenario, recordEvent } = useScenario()

  const findPerson = (type: PersonType, id: string) => people.value.find(person => person.type === type && person.id === id)
  const getStudentApplicationHistory = (id: string) => applicationHistory[id] || []

  const addActivity = (person: PersonRecord, action: string, detail: string) => {
    person.activities.unshift({
      id: crypto.randomUUID(),
      action,
      detail,
      actor: scenario.value.userName,
      occurredAt: new Date().toISOString(),
    })
    recordEvent(`${action}: ${person.id}`)
  }

  const createPerson = (type: PersonType, input: PersonInput) => {
    if (findPerson(type, input.id)) throw new Error('duplicate-id')
    const person: PersonRecord = {
      ...input,
      type,
      recordStatus: 'active',
      accountStatus: 'first-login',
      activities: [],
    }
    addActivity(person, 'สร้างข้อมูลและบัญชี', 'สร้างบัญชีสถานะรอเข้าสู่ระบบครั้งแรก')
    people.value.unshift(person)
    return person
  }

  const updatePerson = (person: PersonRecord, input: PersonInput) => {
    const changed = [
      person.id !== input.id ? `รหัส ${person.id} → ${input.id}` : '',
      person.prefix !== input.prefix ? `คำนำหน้า ${person.prefix} → ${input.prefix}` : '',
      person.firstName !== input.firstName ? `ชื่อ ${person.firstName} → ${input.firstName}` : '',
      person.lastName !== input.lastName ? `นามสกุล ${person.lastName} → ${input.lastName}` : '',
      person.cycle !== input.cycle ? `รอบ ${person.cycle || '-'} → ${input.cycle || '-'}` : '',
      person.section !== input.section ? `หมู่เรียน ${person.section || '-'} → ${input.section || '-'}` : '',
    ].filter(Boolean)
    if (!changed.length) return person
    const duplicate = people.value.some(item => item !== person && item.type === person.type && item.id === input.id)
    if (duplicate) throw new Error('duplicate-id')
    Object.assign(person, input)
    addActivity(person, 'แก้ไขข้อมูลบุคคล', changed.join(', '))
    return person
  }

  const suspendAccount = (person: PersonRecord) => {
    person.accountStatus = 'suspended'
    addActivity(person, 'ระงับบัญชีชั่วคราว', 'ยกเลิก Session เดิมและระงับการเข้าสู่ระบบ')
  }

  const activateAccount = (person: PersonRecord) => {
    person.accountStatus = 'active'
    addActivity(person, 'เปิดใช้งานบัญชี', 'อนุญาตให้เข้าสู่ระบบได้อีกครั้ง')
  }

  const terminatePerson = (person: PersonRecord) => {
    person.recordStatus = 'inactive'
    person.accountStatus = 'terminated'
    addActivity(person, 'ยุติการใช้งานข้อมูล', 'ยุติบัญชีและคงข้อมูลอ้างอิงกับประวัติเดิมไว้')
  }

  const restorePerson = (person: PersonRecord) => {
    person.recordStatus = 'active'
    person.accountStatus = 'active'
    addActivity(person, 'เปิดใช้งานข้อมูลอีกครั้ง', 'เปิดข้อมูลและบัญชีให้กลับมาใช้งาน')
  }

  const resetPassword = (person: PersonRecord) => {
    person.accountStatus = 'first-login'
    addActivity(person, 'รีเซ็ตรหัสผ่าน', 'ยกเลิก Session เดิมและบังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป')
  }

  const importPeople = (type: PersonType, rows: PersonInput[]) => {
    let created = 0
    let updated = 0
    rows.forEach((input) => {
      const person = findPerson(type, input.id)
      if (person) {
        updatePerson(person, { ...input, cycle: person.cycle })
        updated += 1
        return
      }
      createPerson(type, input)
      created += 1
    })
    recordEvent(`นำเข้าข้อมูล${type === 'student' ? 'นักศึกษา' : 'อาจารย์'}สำเร็จ: เพิ่ม ${created} อัปเดต ${updated}`)
    return { created, updated }
  }

  return {
    people,
    findPerson,
    getStudentApplicationHistory,
    createPerson,
    updatePerson,
    suspendAccount,
    activateAccount,
    terminatePerson,
    restorePerson,
    resetPassword,
    importPeople,
  }
}
