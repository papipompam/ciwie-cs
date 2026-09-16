import { peopleImportResponseSchema, peopleResponseSchema, personRecordSchema } from '#shared/people'
import { requestAwareFetch } from '../utils/requestAwareFetch'
import type { PeopleImportCredential } from './usePeopleImport'

// โมเดลข้อมูลบุคคลที่ใช้ร่วมกันระหว่างหน้าจัดการนักศึกษาและอาจารย์
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
  accountId?: string
  type: PersonType
  prefix: PersonPrefix
  firstName: string
  lastName: string
  phone?: string
  email?: string
  cohortYear?: number
  gender?: 'male' | 'female'
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
  phone?: string
  email?: string
  gender?: 'male' | 'female'
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

/** Replace one person type with the persisted response, including an empty response. */
export const replacePeopleByType = (existing: PersonRecord[], type: PersonType, records: PersonRecord[]) => [
  ...existing.filter(person => person.type !== type),
  ...records,
]

export const personPrefixOptions: Record<PersonType, Array<{ value: PersonPrefix, label: string }>> = {
  student: ['นาย', 'นางสาว', 'นาง'].map(value => ({ value: value as PersonPrefix, label: value })),
  lecturer: ['นาย', 'นางสาว', 'นาง', 'อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'].map(value => ({ value: value as PersonPrefix, label: value })),
}

export const getPersonFullName = (person: Pick<PersonRecord, 'prefix' | 'firstName' | 'lastName'>) => `${person.prefix}${person.firstName} ${person.lastName}`
export const getPersonAccountId = (person: Pick<PersonRecord, 'id' | 'accountId'>) => person.accountId ?? person.id

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
  // เก็บข้อมูลไว้ใน state กลาง เพื่อให้รายการและหน้ารายละเอียดใช้ข้อมูลชุดเดียวกัน
  const people = useState<PersonRecord[]>('people-directory-v2', () => [])
  const { scenario, recordEvent } = useScenario()

  const findPerson = (type: PersonType, id: string) => people.value.find(person => person.type === type && (person.id === id || person.accountId === id))
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
      person.phone !== input.phone ? `เบอร์โทร ${person.phone || '-'} → ${input.phone || '-'}` : '',
      person.email !== input.email ? `อีเมล ${person.email || '-'} → ${input.email || '-'}` : '',
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
    // แถวที่มีรหัสเดิมจะถูกอัปเดต ส่วนรหัสใหม่จะถูกสร้างเป็นรายการใหม่
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

  const loadPersistedPeople = async (type: PersonType) => {
    // แปลง response ด้วย schema ก่อนนำข้อมูลจาก server เข้า state ของหน้าเว็บ
    const { people: records } = peopleResponseSchema.parse(await requestAwareFetch('/api/people', { query: { type } }))
    people.value = replacePeopleByType(people.value, type, records)
    return records
  }

  const persistCreatePerson = async (type: PersonType, input: PersonInput) => {
    // การสร้างจริงใช้ API ฝั่งเจ้าหน้าที่ ส่วน state จะอัปเดตเมื่อ server ตอบกลับสำเร็จ
    const person = personRecordSchema.parse(await requestAwareFetch('/api/staff/people', { method: 'POST', body: { type, ...input } }))
    people.value.unshift(person)
    return person
  }

  const persistImportPeople = async (type: PersonType, inputs: PersonInput[]) => {
    // Keep each server transaction short enough for serverless runtimes. A
    // large import performs several database writes per row and can otherwise
    // exceed the function request limit even though the API transaction timeout
    // is configured for longer imports.
    const batchSize = 5
    const result = { created: 0, updated: 0, duplicates: [] as string[], credentials: [] as PeopleImportCredential[] }
    for (let index = 0; index < inputs.length; index += batchSize) {
      const batch = peopleImportResponseSchema.parse(await requestAwareFetch('/api/staff/people/import', {
        method: 'POST', body: { type, people: inputs.slice(index, index + batchSize) }, reload: false,
      }))
      result.created += batch.created
      result.updated += batch.updated
      result.duplicates.push(...batch.duplicates)
      result.credentials.push(...batch.credentials)
    }
    // Do not discard the one-time credentials if the follow-up directory refresh fails.
    try {
      await loadPersistedPeople(type)
    }
    catch (error) {
      console.error(error)
    }
    return result
  }

  const persistUpdatePerson = async (person: PersonRecord, input: PersonInput) => {
    const updated = personRecordSchema.parse(await requestAwareFetch(`/api/staff/people/${encodeURIComponent(person.id)}`, { method: 'PATCH', body: input }))
    Object.assign(person, updated)
    return person
  }

  const persistAccountAction = async (
    person: PersonRecord,
    body: { action: 'suspend' | 'activate' | 'terminate' | 'restore' }
      | { action: 'reset-password', temporaryPassword: string },
  ) => {
    const updated = personRecordSchema.parse(await requestAwareFetch(`/api/staff/people/${encodeURIComponent(person.id)}`, { method: 'PATCH', body }))
    Object.assign(person, updated)
    return person
  }

  const persistLecturerStudentName = async (person: PersonRecord, input: Pick<PersonInput, 'prefix' | 'firstName' | 'lastName'>) => {
    const updated = personRecordSchema.parse(await requestAwareFetch(`/api/people/${encodeURIComponent(person.id)}`, { method: 'PATCH', body: input }))
    Object.assign(person, updated)
    return person
  }

  return {
    people,
    findPerson,
    createPerson,
    updatePerson,
    suspendAccount,
    activateAccount,
    terminatePerson,
    restorePerson,
    resetPassword,
    importPeople,
    loadPersistedPeople,
    persistCreatePerson,
    persistImportPeople,
    persistUpdatePerson,
    persistAccountAction,
    persistLecturerStudentName,
  }
}
