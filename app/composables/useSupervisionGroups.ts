import type { PersonPrefix, StudentSection } from './usePeopleDirectory'
import { z } from 'zod'
import type { PlacementRequestPreview } from '#shared/placement-requests'

export type SupervisionRound = 1 | 2
export type CompanyRecordStatus = 'active' | 'inactive'

export interface CompanyRecord {
  latitude?: number | null
  longitude?: number | null
  id: string
  name: string
  branch: string
  province: string
  region: string
  address: string
  contactName: string
  contactPhone: string
  status: CompanyRecordStatus
  createdAt: string
  updatedAt: string
}

export type CompanyInput = Pick<CompanyRecord, 'name' | 'branch' | 'province' | 'region' | 'address' | 'contactName' | 'contactPhone' | 'latitude' | 'longitude'>

export interface SupervisionCompanyStudent {
  id: string
  studentId: string
  studentName: string
  prefix: string
  firstName: string
  lastName: string
  section: string
  position: string
}

export interface CompanyStudentInput {
  prefix: string
  firstName: string
  lastName: string
  section: string
  position: string
}

export interface SupervisionPlacement {
  id: string
  cycleId: string
  studentId: string
  studentName: string
  companyId: string
  company: string
  branch: string
  province: string
  region: string
  position: string
}

export interface SupervisionCompany {
  latitude?: number | null
  longitude?: number | null
  id: string
  cycleId: string
  name: string
  branch: string
  province: string
  region: string
  address: string
  contactName: string
  contactPhone: string
  status: CompanyRecordStatus
  studentCount: number
  students: SupervisionCompanyStudent[]
}

export interface SupervisionGroup {
  id: string
  cycleId: string
  round: SupervisionRound
  name: string
  lecturerIds: string[]
  companyIds: string[]
  createdAt: string
}

export interface SupervisionGroupInput {
  cycleId: string
  round: SupervisionRound
  name: string
  lecturerIds: string[]
  companyIds: string[]
}

const placementsSeed: SupervisionPlacement[] = [
  { id: 'SP-001', cycleId: 'CYCLE-2569-2', studentId: '66123456701', studentName: 'ธนกฤต พูนทรัพย์', companyId: 'SC-001', company: 'บริษัท สยามเทค โซลูชัน จำกัด', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'Frontend Developer' },
  { id: 'SP-002', cycleId: 'CYCLE-2569-2', studentId: '66123456702', studentName: 'ณัฐชา ศรีสุข', companyId: 'SC-001', company: 'บริษัท สยามเทค โซลูชัน จำกัด', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'Software Tester' },
  { id: 'SP-003', cycleId: 'CYCLE-2569-2', studentId: '66123456704', studentName: 'ภัทรวดี คำแสน', companyId: 'SC-002', company: 'บริษัท บุรีรัมย์เว็บ จำกัด', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'Web Developer' },
  { id: 'SP-004', cycleId: 'CYCLE-2569-2', studentId: '66123456708', studentName: 'ชยพล พรมดี', companyId: 'SC-003', company: 'บริษัท โคราชซอฟต์ จำกัด', branch: 'สำนักงานใหญ่', province: 'นครราชสีมา', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'Backend Developer' },
  { id: 'SP-005', cycleId: 'CYCLE-2569-2', studentId: '66123456711', studentName: 'ปวีณ์นุช มั่นคง', companyId: 'SC-004', company: 'บริษัท อีสานเทค จำกัด', branch: 'สาขาขอนแก่น', province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'UX/UI Designer' },
  { id: 'SP-006', cycleId: 'CYCLE-2569-2', studentId: '66123456715', studentName: 'นภัสสร มีสุข', companyId: 'SC-005', company: 'บริษัท นอร์ทเทิร์นดิจิทัล จำกัด', branch: 'สาขาเชียงใหม่', province: 'เชียงใหม่', region: 'ภาคเหนือ', position: 'Data Analyst' },
  { id: 'SP-007', cycleId: 'CYCLE-2569-2', studentId: '66123456720', studentName: 'ศุภกร รุ่งเรือง', companyId: 'SC-006', company: 'บริษัท บางกอกคลาวด์ จำกัด', branch: 'สำนักงานใหญ่', province: 'กรุงเทพมหานคร', region: 'ภาคกลาง', position: 'Cloud Engineer' },
  { id: 'SP-008', cycleId: 'CYCLE-2569-SUMMER', studentId: '66123456725', studentName: 'อรอนงค์ สายใจ', companyId: 'SC-007', company: 'บริษัท ภูเก็ตสมาร์ท จำกัด', branch: 'สำนักงานใหญ่', province: 'ภูเก็ต', region: 'ภาคใต้', position: 'Software Developer' },
  { id: 'SP-009', cycleId: 'CYCLE-2569-2', studentId: '66123456723', studentName: 'กิตติพงษ์ แสงทอง', companyId: 'SC-003', company: 'บริษัท โคราชซอฟต์ จำกัด', branch: 'สำนักงานใหญ่', province: 'นครราชสีมา', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'DevOps Engineer' },
  { id: 'SP-010', cycleId: 'CYCLE-2569-2', studentId: '66123456727', studentName: 'พิชญา จันทร์ดี', companyId: 'SC-004', company: 'บริษัท อีสานเทค จำกัด', branch: 'สาขาขอนแก่น', province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'Business Analyst' },
  { id: 'SP-011', cycleId: 'CYCLE-2569-2', studentId: '66123456731', studentName: 'รัฐภูมิ บุญมี', companyId: 'SC-004', company: 'บริษัท อีสานเทค จำกัด', branch: 'สาขาขอนแก่น', province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ', position: 'Mobile Developer' },
  { id: 'SP-012', cycleId: 'CYCLE-2569-2', studentId: '66123456734', studentName: 'ศิริพร มณีวงศ์', companyId: 'SC-006', company: 'บริษัท บางกอกคลาวด์ จำกัด', branch: 'สำนักงานใหญ่', province: 'กรุงเทพมหานคร', region: 'ภาคกลาง', position: 'System Engineer' },
  { id: 'SP-013', cycleId: 'CYCLE-2569-2', studentId: '66123456738', studentName: 'ธนภัทร วงศ์คำ', companyId: 'SC-008', company: 'บริษัท ศูนย์นวัตกรรมดิจิทัลภาคตะวันออก จำกัด', branch: 'สาขาชลบุรี', province: 'ชลบุรี', region: 'ภาคตะวันออก', position: 'AI Engineer' },
  { id: 'SP-014', cycleId: 'CYCLE-2569-2', studentId: '66123456742', studentName: 'ชนาภา สุขเกษม', companyId: 'SC-008', company: 'บริษัท ศูนย์นวัตกรรมดิจิทัลภาคตะวันออก จำกัด', branch: 'สาขาชลบุรี', province: 'ชลบุรี', region: 'ภาคตะวันออก', position: 'Data Engineer' },
  { id: 'SP-015', cycleId: 'CYCLE-2569-SUMMER', studentId: '66123456746', studentName: 'วรพล อินทร์แก้ว', companyId: 'SC-007', company: 'บริษัท ภูเก็ตสมาร์ท จำกัด', branch: 'สำนักงานใหญ่', province: 'ภูเก็ต', region: 'ภาคใต้', position: 'QA Engineer' },
]

const companyRecordsSeed: CompanyRecord[] = [
  { id: 'SC-001', name: 'บริษัท สยามเทค โซลูชัน จำกัด', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', address: '88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', latitude: 14.993, longitude: 103.102, contactName: 'คุณกาญจนา วัฒนชัย', contactPhone: '044-611-208', status: 'active', createdAt: '2026-07-10T09:00:00+07:00', updatedAt: '2026-08-20T10:30:00+07:00' },
  { id: 'SC-002', name: 'บริษัท บุรีรัมย์เว็บ จำกัด', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', address: '125 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', latitude: 14.999, longitude: 103.108, contactName: 'คุณสุเมธ คงมั่น', contactPhone: '044-620-115', status: 'active', createdAt: '2026-07-12T09:00:00+07:00', updatedAt: '2026-08-21T14:10:00+07:00' },
  { id: 'SC-003', name: 'บริษัท โคราชซอฟต์ จำกัด', branch: 'สำนักงานใหญ่', province: 'นครราชสีมา', region: 'ภาคตะวันออกเฉียงเหนือ', address: '299 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000', latitude: 14.98, longitude: 102.097, contactName: 'คุณปรีชา ศรีสุข', contactPhone: '044-255-901', status: 'active', createdAt: '2026-07-14T09:00:00+07:00', updatedAt: '2026-08-22T09:45:00+07:00' },
  { id: 'SC-004', name: 'บริษัท อีสานเทค จำกัด', branch: 'สาขาขอนแก่น', province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ', address: '55/21 ถนนศรีจันทร์ ตำบลในเมือง อำเภอเมืองขอนแก่น จังหวัดขอนแก่น 40000', latitude: 16.432, longitude: 102.823, contactName: 'คุณอรอนงค์ แก้วใส', contactPhone: '043-225-478', status: 'active', createdAt: '2026-07-18T09:00:00+07:00', updatedAt: '2026-08-23T11:20:00+07:00' },
  { id: 'SC-005', name: 'บริษัท นอร์ทเทิร์นดิจิทัล จำกัด', branch: 'สาขาเชียงใหม่', province: 'เชียงใหม่', region: 'ภาคเหนือ', address: '18 ถนนนิมมานเหมินท์ ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200', latitude: 18.796, longitude: 98.967, contactName: 'คุณธนกร พิทักษ์วงศ์', contactPhone: '053-218-644', status: 'active', createdAt: '2026-07-20T09:00:00+07:00', updatedAt: '2026-08-24T13:30:00+07:00' },
  { id: 'SC-006', name: 'บริษัท บางกอกคลาวด์ จำกัด', branch: 'สำนักงานใหญ่', province: 'กรุงเทพมหานคร', region: 'ภาคกลาง', address: '99 อาคารคลาวด์ทาวเวอร์ ถนนรัชดาภิเษก เขตดินแดง กรุงเทพมหานคร 10400', latitude: 13.77, longitude: 100.573, contactName: 'คุณณัฐพล พงษ์สวัสดิ์', contactPhone: '02-245-8890', status: 'active', createdAt: '2026-07-22T09:00:00+07:00', updatedAt: '2026-08-25T08:50:00+07:00' },
  { id: 'SC-007', name: 'บริษัท ภูเก็ตสมาร์ท จำกัด', branch: 'สำนักงานใหญ่', province: 'ภูเก็ต', region: 'ภาคใต้', address: '42 ถนนเทพกระษัตรี ตำบลตลาดใหญ่ อำเภอเมืองภูเก็ต จังหวัดภูเก็ต 83000', latitude: 7.884, longitude: 98.39, contactName: 'คุณสุนิสา รัตนกุล', contactPhone: '076-221-490', status: 'active', createdAt: '2026-07-24T09:00:00+07:00', updatedAt: '2026-08-26T10:15:00+07:00' },
  { id: 'SC-008', name: 'บริษัท ศูนย์นวัตกรรมดิจิทัลภาคตะวันออก จำกัด', branch: 'สาขาชลบุรี', province: 'ชลบุรี', region: 'ภาคตะวันออก', address: '700/12 นิคมอุตสาหกรรมอมตะซิตี้ ตำบลคลองตำหรุ อำเภอเมืองชลบุรี จังหวัดชลบุรี 20000', latitude: 13.361, longitude: 101.009, contactName: 'คุณภาคภูมิ วงศ์อนันต์', contactPhone: '038-458-721', status: 'active', createdAt: '2026-07-26T09:00:00+07:00', updatedAt: '2026-08-27T16:40:00+07:00' },
  { id: 'SC-009', name: 'ห้างหุ้นส่วนจำกัด บุรีรัมย์อินโนเวชัน', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ', address: '19 ถนนปลัดเมือง ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', contactName: 'คุณศิริพร บุญมาก', contactPhone: '044-612-990', status: 'inactive', createdAt: '2025-06-10T09:00:00+07:00', updatedAt: '2026-05-15T13:00:00+07:00' },
]

const studentPrefixes: Record<string, 'นาย' | 'นางสาว'> = {
  '66123456701': 'นาย', '66123456702': 'นางสาว', '66123456704': 'นางสาว', '66123456708': 'นาย', '66123456711': 'นางสาว',
  '66123456715': 'นางสาว', '66123456720': 'นาย', '66123456725': 'นางสาว', '66123456723': 'นาย', '66123456727': 'นางสาว',
  '66123456731': 'นาย', '66123456734': 'นางสาว', '66123456738': 'นาย', '66123456742': 'นางสาว', '66123456746': 'นาย',
}

const studentSections: Record<string, string> = {
  '66123456701': 'หมู่ 1', '66123456702': 'หมู่ 1', '66123456704': 'หมู่ 2', '66123456708': 'หมู่ 1', '66123456711': 'หมู่ 2',
  '66123456715': 'หมู่ 1', '66123456720': 'หมู่ 2', '66123456725': 'หมู่ 2', '66123456723': 'หมู่ 1', '66123456727': 'หมู่ 2',
  '66123456731': 'หมู่ 1', '66123456734': 'หมู่ 2', '66123456738': 'หมู่ 1', '66123456742': 'หมู่ 2', '66123456746': 'หมู่ 1',
}

const groupsSeed: SupervisionGroup[] = [
  { id: 'SG-001', cycleId: 'CYCLE-2569-2', round: 1, name: 'กลุ่มอาจารย์ 1', lecturerIds: ['L0012'], companyIds: ['SC-001', 'SC-002'], createdAt: '2026-08-29T10:00:00+07:00' },
  { id: 'SG-002', cycleId: 'CYCLE-2569-2', round: 2, name: 'กลุ่มอาจารย์ 1', lecturerIds: ['L0021'], companyIds: ['SC-001', 'SC-003'], createdAt: '2026-08-30T09:30:00+07:00' },
  { id: 'SG-003', cycleId: 'CYCLE-2569-2', round: 1, name: 'กลุ่มอาจารย์ 2', lecturerIds: ['L0021'], companyIds: ['SC-003'], createdAt: '2026-08-30T13:15:00+07:00' },
]

export const useSupervisionGroups = () => {
  const placements = useState<SupervisionPlacement[]>('supervision-placements-v4', () => structuredClone(placementsSeed))
  const groups = useState<SupervisionGroup[]>('supervision-groups-v3', () => structuredClone(groupsSeed))
  const companyRecords = useState<CompanyRecord[]>('company-records-v1', () => structuredClone(companyRecordsSeed))
  const studentProfiles = useState<Record<string, { prefix: string, section: string }>>('supervision-student-profiles-v1', () => Object.fromEntries(
    Object.keys(studentPrefixes).map(id => [id, { prefix: studentPrefixes[id] ?? 'นาย', section: studentSections[id] ?? 'ยังไม่กำหนด' }]),
  ))
  const { recordEvent } = useScenario()
  const { currentAccount } = useAuthPrototype()
  const requireStaff = () => {
    if (currentAccount.value?.role !== 'staff') throw new Error('เฉพาะเจ้าหน้าที่เท่านั้นที่จัดกลุ่มนิเทศได้')
  }

  const getCompanies = (cycleId: string): SupervisionCompany[] => {
    const byCompany = new Map<string, SupervisionCompany>()
    placements.value.filter(item => item.cycleId === cycleId).forEach((placement) => {
      const company = byCompany.get(placement.companyId)
      const [firstName = placement.studentName, lastName = ''] = placement.studentName.split(' ')
      const profile = studentProfiles.value[placement.studentId] ?? { prefix: 'นาย', section: 'ยังไม่กำหนด' }
      const student = { id: placement.id, studentId: placement.studentId, studentName: `${profile.prefix}${placement.studentName}`, prefix: profile.prefix, firstName, lastName, section: profile.section, position: placement.position }
      if (company) {
        company.students.push(student)
        company.studentCount = company.students.length
        return
      }
      const record = companyRecords.value.find(item => item.id === placement.companyId)
      byCompany.set(placement.companyId, {
        id: placement.companyId,
        cycleId: placement.cycleId,
        name: placement.company,
        branch: placement.branch,
        province: placement.province,
        region: placement.region,
        address: record?.address ?? 'ยังไม่มีข้อมูลที่อยู่',
        latitude: record?.latitude,
        longitude: record?.longitude,
        contactName: record?.contactName ?? 'ยังไม่มีข้อมูลผู้ประสานงาน',
        contactPhone: record?.contactPhone ?? 'ยังไม่มีข้อมูลเบอร์โทรศัพท์',
        status: record?.status ?? 'active',
        studentCount: 1,
        students: [student],
      })
    })
    return [...byCompany.values()]
  }

  const getGroup = (id: string) => groups.value.find(group => group.id === id) ?? null
  const getCompanyRecord = (id: string) => companyRecords.value.find(company => company.id === id) ?? null
  const getCompanyPlacements = (id: string) => placements.value.filter(placement => placement.companyId === id)
  const getStudentProfile = (id: string) => studentProfiles.value[id] ?? { prefix: 'นาย', section: 'ยังไม่กำหนด' }
  const getGroupCompanies = (group: SupervisionGroup) => getCompanies(group.cycleId).filter(company => group.companyIds.includes(company.id))
  const getAssignedCompanyIds = (cycleId: string, round: SupervisionRound) => new Set(groups.value
    .filter(group => group.cycleId === cycleId && group.round === round)
    .flatMap(group => group.companyIds))
  const getUnassignedCompanies = (cycleId: string, round: SupervisionRound) => {
    const assignedIds = getAssignedCompanyIds(cycleId, round)
    return getCompanies(cycleId).filter(company => !assignedIds.has(company.id))
  }
  const getAssignedLecturerIds = (cycleId: string, round: SupervisionRound) => new Set(groups.value
    .filter(group => group.cycleId === cycleId && group.round === round)
    .flatMap(group => group.lecturerIds))

  const createGroup = (input: SupervisionGroupInput) => {
    requireStaff()
    z.object({ name: z.string().trim().min(1), cycleId: z.string().min(1), round: z.union([z.literal(1), z.literal(2)]), lecturerIds: z.array(z.string()), companyIds: z.array(z.string()).min(1) }).parse(input)
    const selectedCompanies = getCompanies(input.cycleId).filter(company => input.companyIds.includes(company.id))
    const assignedCompanyIds = getAssignedCompanyIds(input.cycleId, input.round)
    const assignedLecturerIds = getAssignedLecturerIds(input.cycleId, input.round)
    if (!input.companyIds.length) throw new Error('company-required')
    if (input.lecturerIds.some(id => assignedLecturerIds.has(id))) throw new Error('lecturer-already-assigned')
    if (input.companyIds.some(id => assignedCompanyIds.has(id))) throw new Error('company-already-assigned')
    if (selectedCompanies.length !== input.companyIds.length) throw new Error('company-invalid')
    const nextNumber = Math.max(0, ...groups.value.map(group => Number(group.id.replace('SG-', '')) || 0)) + 1
    const group: SupervisionGroup = {
      ...input,
      id: `SG-${String(nextNumber).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    }
    groups.value.unshift(group)
    recordEvent(`สร้าง ${group.name} สำหรับการนิเทศครั้งที่ ${group.round}`)
    return group
  }

  const createSuggestedGroups = (cycleId: string, round: SupervisionRound, suggestions: string[][], lecturerSuggestions: string[][] = []) => {
    requireStaff()
    const available = new Set(getUnassignedCompanies(cycleId, round).map(company => company.id))
    const ids = suggestions.flat()
    if (!suggestions.length || suggestions.some(group => !group.length) || new Set(ids).size !== ids.length || ids.some(id => !available.has(id))) throw new Error('ข้อมูลสถานประกอบการเปลี่ยนแล้ว กรุณาจัดกลุ่มใหม่')
    if (lecturerSuggestions.length > suggestions.length) throw new Error('ข้อมูลกลุ่มอาจารย์ไม่ถูกต้อง กรุณาเลือกใหม่')
    const proposedLecturerGroups = suggestions.map((_, index) => lecturerSuggestions[index] ?? [])
    const proposedLecturerIds = proposedLecturerGroups.flat()
    const { people } = usePeopleDirectory()
    const eligibleLecturerIds = new Set(people.value
      .filter(person => person.type === 'lecturer' && person.recordStatus === 'active' && !['suspended', 'terminated'].includes(person.accountStatus))
      .map(person => person.id))
    const assignedLecturerIds = getAssignedLecturerIds(cycleId, round)
    if (new Set(proposedLecturerIds).size !== proposedLecturerIds.length
      || proposedLecturerIds.some(id => !eligibleLecturerIds.has(id) || assignedLecturerIds.has(id))) {
      throw new Error('อาจารย์ไม่พร้อมใช้งานหรืออยู่ในกลุ่มอื่นแล้ว กรุณาเลือกใหม่')
    }
    const start = groups.value.filter(group => group.cycleId === cycleId && group.round === round).length
    return suggestions.map((companyIds, index) => createGroup({ cycleId, round, name: `กลุ่มนิเทศ ${start + index + 1}`, companyIds, lecturerIds: proposedLecturerGroups[index] ?? [] }))
  }

  const assignLecturers = (groupId: string, lecturerIds: string[]) => {
    requireStaff()
    const ids = z.array(z.string().min(1)).min(1, 'เลือกอาจารย์อย่างน้อย 1 คน').parse(lecturerIds)
    const group = getGroup(groupId)
    if (!group) throw new Error('ไม่พบกลุ่มนิเทศ')
    const { people } = usePeopleDirectory()
    const eligible = new Set(people.value.filter(person => person.type === 'lecturer' && person.recordStatus === 'active' && !['suspended', 'terminated'].includes(person.accountStatus)).map(person => person.id))
    const assigned = new Set(groups.value.filter(item => item.id !== groupId && item.cycleId === group.cycleId && item.round === group.round).flatMap(item => item.lecturerIds))
    if (new Set(ids).size !== ids.length || ids.some(id => !eligible.has(id) || assigned.has(id))) throw new Error('อาจารย์ไม่พร้อมใช้งานหรืออยู่ในกลุ่มอื่นแล้ว')
    group.lecturerIds = [...ids]
    recordEvent(`กำหนดอาจารย์ให้ ${group.name}`)
  }

  const registerConfirmedPlacement = (request: PlacementRequestPreview, cycleId: string) => {
    requireStaff()
    const application = request.application
    const existing = placements.value.find(item => item.studentId === application.studentId && item.cycleId === cycleId)
    if (existing) {
      if (existing.id !== `SP-${request.id}`) throw new Error('นักศึกษามีสถานที่ฝึกงานที่ยืนยันแล้วในรอบนี้')
      return
    }
    const company = companyRecords.value.find(item => item.name === application.companyName && item.address === application.companyLocation)
      ?? createCompany({ name: application.companyName, branch: 'สำนักงานใหญ่', province: application.province, region: 'ยังไม่ระบุ', address: application.companyLocation, contactName: 'ยังไม่ระบุ', contactPhone: 'ยังไม่ระบุ', latitude: application.latitude, longitude: application.longitude })
    placements.value.push({ id: `SP-${request.id}`, cycleId, studentId: application.studentId, studentName: request.studentName, companyId: company.id, company: company.name, branch: company.branch, province: company.province, region: company.region, position: application.position })
    const { people } = usePeopleDirectory()
    const person = people.value.find(item => item.type === 'student' && item.id === application.studentId)
    if (person) person.company = company.name
  }

  const createCompany = (input: CompanyInput) => {
    const nextNumber = Math.max(0, ...companyRecords.value.map(company => Number(company.id.replace('SC-', '')) || 0)) + 1
    const now = new Date().toISOString()
    const company: CompanyRecord = { ...input, id: `SC-${String(nextNumber).padStart(3, '0')}`, status: 'active', createdAt: now, updatedAt: now }
    companyRecords.value.unshift(company)
    recordEvent(`เพิ่มสถานประกอบการ ${company.name}`)
    return company
  }

  const updateCompany = (company: CompanyRecord, input: CompanyInput) => {
    Object.assign(company, input, { updatedAt: new Date().toISOString() })
    getCompanyPlacements(company.id).forEach((placement) => {
      Object.assign(placement, { company: company.name, branch: company.branch, province: company.province, region: company.region })
    })
    recordEvent(`แก้ไขสถานประกอบการ ${company.name}`)
    return company
  }

  const deactivateCompany = (company: CompanyRecord) => {
    company.status = 'inactive'
    company.updatedAt = new Date().toISOString()
    recordEvent(`ยุติการใช้งานสถานประกอบการ ${company.name}`)
  }

  const restoreCompany = (company: CompanyRecord) => {
    company.status = 'active'
    company.updatedAt = new Date().toISOString()
    recordEvent(`เปิดใช้งานสถานประกอบการ ${company.name}`)
  }

  const deleteCompany = (company: CompanyRecord) => {
    if (getCompanyPlacements(company.id).length) throw new Error('company-in-use')
    companyRecords.value = companyRecords.value.filter(item => item.id !== company.id)
    recordEvent(`ลบสถานประกอบการ ${company.name}`)
  }

  const updateCompanyStudent = (placementId: string, input: CompanyStudentInput) => {
    const placement = placements.value.find(item => item.id === placementId)
    if (!placement) throw new Error('student-placement-not-found')
    placement.studentName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim()
    placement.position = input.position.trim()
    studentProfiles.value[placement.studentId] = { prefix: input.prefix, section: input.section }
    const { findPerson, updatePerson } = usePeopleDirectory()
    const person = findPerson('student', placement.studentId)
    if (person) updatePerson(person, { id: person.id, prefix: input.prefix as PersonPrefix, firstName: input.firstName.trim(), lastName: input.lastName.trim(), cycle: person.cycle, section: input.section as StudentSection })
    recordEvent(`แก้ไขนักศึกษา ${placement.studentId} ใน ${placement.company}`)
    return placement
  }

  return {
    placements,
    groups,
    companyRecords,
    getGroup,
    getCompanyRecord,
    getCompanyPlacements,
    getStudentProfile,
    getCompanies,
    getGroupCompanies,
    getUnassignedCompanies,
    getAssignedLecturerIds,
    createGroup,
    createSuggestedGroups,
    assignLecturers,
    registerConfirmedPlacement,
    createCompany,
    updateCompany,
    deactivateCompany,
    restoreCompany,
    deleteCompany,
    updateCompanyStudent,
  }
}
