import type { PersonPrefix, StudentSection } from './usePeopleDirectory'
import { z } from 'zod'
import type { PlacementRequestPreview } from '#shared/placement-requests'
import type { SupervisionCompanyDto, SupervisionGroupDto, SupervisionLecturerDto } from '#shared/supervision-groups'
import { companiesResponseSchema, companyRecordSchema } from '#shared/companies'
import { requestAwareFetch } from '../utils/requestAwareFetch'

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
  status: CompanyRecordStatus
  createdAt: string
  updatedAt: string
}

export type CompanyInput = Pick<CompanyRecord, 'name' | 'branch' | 'province' | 'region' | 'address' | 'contactName' | 'latitude' | 'longitude'>

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

export const useSupervisionGroups = () => {
  const placements = useState<SupervisionPlacement[]>('supervision-placements-v5', () => [])
  const groups = useState<SupervisionGroup[]>('supervision-groups-v4', () => [])
  const companyRecords = useState<CompanyRecord[]>('company-records-v2', () => [])
  const supervisionLecturers = useState<SupervisionLecturerDto[]>('supervision-lecturers-v2', () => [])
  const studentProfiles = useState<Record<string, { prefix: string, section: string }>>('supervision-student-profiles-v2', () => ({}))
  const { recordEvent } = useScenario()
  const { currentAccount } = useAuthPrototype()
  const requireStaff = () => {
    if (currentAccount.value?.role !== 'staff') throw new Error('เฉพาะเจ้าหน้าที่เท่านั้นที่จัดกลุ่มนิเทศได้')
  }

  const syncPersistedContext = (cycleId: string, data: { companies: SupervisionCompanyDto[], groups: SupervisionGroupDto[], lecturers: SupervisionLecturerDto[] }) => {
    groups.value = [
      ...groups.value.filter(group => group.cycleId !== cycleId),
      ...data.groups,
    ]
    placements.value = [
      ...placements.value.filter(placement => placement.cycleId !== cycleId),
      ...data.companies.flatMap(company => company.students.map(student => ({
        id: student.id,
        cycleId,
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        companyId: company.id,
        company: company.name,
        branch: company.branch,
        province: company.province,
        region: company.region,
        position: student.position,
      }))),
    ]
    for (const company of data.companies) {
      const record: CompanyRecord = {
        id: company.id,
        name: company.name,
        branch: company.branch,
        province: company.province,
        region: company.region,
        address: company.address,
        contactName: company.contactName,
        status: company.status,
        latitude: company.latitude,
        longitude: company.longitude,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const index = companyRecords.value.findIndex(item => item.id === company.id)
      if (index === -1) companyRecords.value.push(record)
      else companyRecords.value[index] = { ...companyRecords.value[index]!, ...record }
      for (const student of company.students) studentProfiles.value[student.studentId] = { prefix: student.prefix, section: student.section }
    }
    supervisionLecturers.value = data.lecturers
  }

  const loadPersistedGroups = async (cycleId: string, round: SupervisionRound) => {
    requireStaff()
    const data = await requestAwareFetch('/api/staff/supervision/groups', {
      query: { cycleId, round },
    }) as { companies: SupervisionCompanyDto[], groups: SupervisionGroupDto[], lecturers: SupervisionLecturerDto[] }
    syncPersistedContext(cycleId, data)
    return data
  }

  const persistSuggestedGroups = async (cycleId: string, round: SupervisionRound, proposed: Array<{ name: string, companyIds: string[] }>, reload = true) => {
    requireStaff()
    const saved = await requestAwareFetch('/api/staff/supervision/groups', {
      method: 'POST',
      body: { cycleId, round, groups: proposed },
      reload,
    }) as SupervisionGroupDto[]
    groups.value = [...groups.value, ...saved]
    return saved
  }

  const persistLecturers = async (groupId: string, lecturerIds: string[], reload = true) => {
    requireStaff()
    const saved = await requestAwareFetch(`/api/staff/supervision/groups/${groupId}/lecturers`, {
      method: 'PATCH',
      body: { lecturerIds },
      reload,
    }) as SupervisionGroupDto
    const index = groups.value.findIndex(group => group.id === saved.id)
    if (index !== -1) Object.assign(groups.value[index]!, saved)
    return saved
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
    const eligible = new Set(people.value
      .filter(person => person.type === 'lecturer' && person.recordStatus === 'active' && !['suspended', 'terminated'].includes(person.accountStatus))
      .map(person => person.accountId ?? person.id))
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
      ?? createCompany({ name: application.companyName, branch: 'สำนักงานใหญ่', province: application.province, region: 'ยังไม่ระบุ', address: application.companyLocation, contactName: 'ยังไม่ระบุ', latitude: application.latitude, longitude: application.longitude })
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

  const loadPersistedCompanies = async () => {
    const response = companiesResponseSchema.parse(await requestAwareFetch('/api/companies'))
    companyRecords.value = response.companies
    return response.companies
  }

  const persistCreateCompany = async (input: CompanyInput) => {
    const company = companyRecordSchema.parse(await requestAwareFetch('/api/companies', { method: 'POST', body: input }))
    companyRecords.value.unshift(company)
    recordEvent(`เพิ่มสถานประกอบการ ${company.name}`)
    return company
  }

  const persistUpdateCompany = async (company: CompanyRecord, input: CompanyInput) => {
    const updated = companyRecordSchema.parse(await requestAwareFetch(`/api/companies/${company.id}`, { method: 'PATCH', body: input }))
    Object.assign(company, updated)
    recordEvent(`แก้ไขสถานประกอบการ ${company.name}`)
    return company
  }

  const persistCompanyStatus = async (company: CompanyRecord, status: CompanyRecordStatus) => {
    const updated = companyRecordSchema.parse(await requestAwareFetch(`/api/companies/${company.id}`, { method: 'PATCH', body: { status } }))
    Object.assign(company, updated)
    recordEvent(`${status === 'active' ? 'เปิดใช้งาน' : 'ยุติการใช้งาน'}สถานประกอบการ ${company.name}`)
    return company
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
    supervisionLecturers,
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
    loadPersistedGroups,
    persistSuggestedGroups,
    persistLecturers,
    registerConfirmedPlacement,
    createCompany,
    updateCompany,
    deactivateCompany,
    restoreCompany,
    deleteCompany,
    loadPersistedCompanies,
    persistCreateCompany,
    persistUpdateCompany,
    persistCompanyStatus,
    updateCompanyStudent,
  }
}
