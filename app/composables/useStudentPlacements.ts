import type { StudentWorkStatus } from './useCoopCycles'

export type CompanyStatus = 'active' | 'pending' | 'inactive'
export type PlacementStatus = 'draft' | 'submitted' | 'returned' | 'batched' | 'letter-issued' | 'response-uploaded' | 'response-returned' | 'confirmed' | 'cancelled'

export interface Company {
  id: string
  name: string
  branch: string
  address: string
  province: string
  region: string
  status: CompanyStatus
}

export interface PlacementTimelineItem {
  id: string
  title: string
  description: string
  createdAt: string
}

export interface PlacementRequest {
  id: string
  studentId: string
  cycleId: string
  companyId: string
  position: string
  details: string
  appliedAt: string
  recipientName: string
  recipientRole: string
  letterAddress: string
  status: PlacementStatus
  returnReason?: string
  workStatus?: StudentWorkStatus
  confirmedAt?: string
  updatedAt: string
  timeline: PlacementTimelineItem[]
}

export interface PlacementFormValue {
  companyId: string
  position: string
  details: string
  appliedAt: string
  recipientName: string
  recipientRole: string
  letterAddress: string
}

export interface NewCompanyValue {
  name: string
  address: string
  province: string
}

const initialCompanies: Company[] = [
  {
    id: 'COM-001',
    name: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด',
    branch: 'สำนักงานใหญ่',
    address: '88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์',
    province: 'บุรีรัมย์',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    status: 'active',
  },
  {
    id: 'COM-002',
    name: 'บริษัท อีสานเทค จำกัด',
    branch: 'สาขานครราชสีมา',
    address: '199 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา',
    province: 'นครราชสีมา',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    status: 'active',
  },
  {
    id: 'COM-003',
    name: 'บริษัท สยามอินโนเวชัน จำกัด',
    branch: 'สำนักงานใหญ่',
    address: '45 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร',
    province: 'กรุงเทพมหานคร',
    region: 'ภาคกลาง',
    status: 'pending',
  },
  {
    id: 'COM-004',
    name: 'บริษัท ตัวอย่างยุติการใช้งาน จำกัด',
    branch: 'สำนักงานใหญ่',
    address: '10 ตำบลในเมือง อำเภอเมืองขอนแก่น',
    province: 'ขอนแก่น',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    status: 'inactive',
  },
]

const initialRequests: PlacementRequest[] = [
  {
    id: 'REQ-0269-018',
    studentId: '66123456701',
    cycleId: 'CYCLE-2569-2',
    companyId: 'COM-001',
    position: 'นักพัฒนาเว็บไซต์',
    details: 'พัฒนาและทดสอบระบบงานภายในด้วย Vue และ TypeScript',
    appliedAt: '2026-08-24',
    recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
    recipientRole: 'ฝ่ายทรัพยากรบุคคล',
    letterAddress: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด 88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
    status: 'letter-issued',
    updatedAt: '2026-08-28T09:30:00+07:00',
    timeline: [
      { id: 'TL-018-4', title: 'ออกหนังสือแล้ว', description: 'เจ้าหน้าที่ส่งหนังสือขอความอนุเคราะห์ให้นักศึกษาดาวน์โหลดแล้ว', createdAt: '2026-08-28T09:30:00+07:00' },
      { id: 'TL-018-3', title: 'เจ้าหน้าที่รับคำร้องแล้ว', description: 'เจ้าหน้าที่รับข้อมูลไปดำเนินการออกหนังสือ คำร้องจึงถูกล็อกชั่วคราว', createdAt: '2026-08-27T09:30:00+07:00' },
      { id: 'TL-018-2', title: 'ส่งคำร้องแล้ว', description: 'ส่งข้อมูลให้เจ้าหน้าที่ตรวจสอบ', createdAt: '2026-08-24T14:20:00+07:00' },
      { id: 'TL-018-1', title: 'สร้างฉบับร่าง', description: 'บันทึกข้อมูลคำร้องครั้งแรก', createdAt: '2026-08-24T13:55:00+07:00' },
    ],
  },
  {
    id: 'REQ-0269-006',
    studentId: '66123456701',
    cycleId: 'CYCLE-2569-SUMMER',
    companyId: 'COM-002',
    position: 'นักวิเคราะห์ข้อมูล',
    details: 'จัดเตรียมข้อมูลและสร้างรายงานสำหรับทีมวางแผนธุรกิจ',
    appliedAt: '2026-08-18',
    recipientName: 'คุณศุภชัย พัฒนกิจ',
    recipientRole: 'ผู้จัดการทั่วไป',
    letterAddress: 'บริษัท อีสานเทค จำกัด สาขานครราชสีมา 199 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000',
    status: 'cancelled',
    returnReason: 'กรุณาตรวจสอบชื่อตำแหน่งฝึกงานให้ตรงกับหนังสือตอบรับเบื้องต้น และแก้ชื่อผู้รับหนังสือเป็นผู้จัดการฝ่ายบุคคล',
    updatedAt: '2026-08-22T10:15:00+07:00',
    timeline: [
      { id: 'TL-006-4', title: 'ยกเลิกคำร้อง', description: 'คำร้องนี้สิ้นสุดแล้วและเก็บไว้เป็นประวัติ', createdAt: '2026-08-23T09:00:00+07:00' },
      { id: 'TL-006-3', title: 'ส่งกลับให้แก้ไข', description: 'เจ้าหน้าที่พบข้อมูลที่ต้องปรับก่อนจัดทำหนังสือ', createdAt: '2026-08-22T10:15:00+07:00' },
      { id: 'TL-006-2', title: 'ส่งคำร้องแล้ว', description: 'ส่งข้อมูลให้เจ้าหน้าที่ตรวจสอบ', createdAt: '2026-08-18T16:40:00+07:00' },
      { id: 'TL-006-1', title: 'สร้างฉบับร่าง', description: 'บันทึกข้อมูลคำร้องครั้งแรก', createdAt: '2026-08-18T16:10:00+07:00' },
    ],
  },
  {
    id: 'REQ-0269-002',
    studentId: '66123456701',
    cycleId: 'CYCLE-2570-1',
    companyId: 'COM-003',
    position: 'ผู้ช่วยออกแบบ UX/UI',
    details: 'ออกแบบต้นแบบและทดสอบการใช้งานผลิตภัณฑ์ดิจิทัล',
    appliedAt: '2026-08-12',
    recipientName: 'ผู้อำนวยการฝ่ายบุคคล',
    recipientRole: 'ฝ่ายทรัพยากรบุคคล',
    letterAddress: 'บริษัท สยามอินโนเวชัน จำกัด 45 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900',
    status: 'cancelled',
    updatedAt: '2026-08-13T11:25:00+07:00',
    timeline: [
      { id: 'TL-002-3', title: 'ยกเลิกคำร้อง', description: 'คำร้องนี้สิ้นสุดแล้วและเก็บไว้เป็นประวัติ', createdAt: '2026-08-13T11:25:00+07:00' },
      { id: 'TL-002-2', title: 'ส่งคำร้องแล้ว', description: 'ส่งข้อมูลให้เจ้าหน้าที่ตรวจสอบ พร้อมสถานประกอบการใหม่ที่รอตรวจสอบ', createdAt: '2026-08-12T11:25:00+07:00' },
      { id: 'TL-002-1', title: 'สร้างฉบับร่าง', description: 'บันทึกข้อมูลคำร้องครั้งแรก', createdAt: '2026-08-12T11:10:00+07:00' },
    ],
  },
]

const cloneCompanies = () => initialCompanies.map(company => ({ ...company }))
const cloneRequests = () => initialRequests.map(request => ({
  ...request,
  timeline: request.timeline.map(item => ({ ...item })),
}))

const provinceRegions: Record<string, string> = {
  กรุงเทพมหานคร: 'ภาคกลาง',
  บุรีรัมย์: 'ภาคตะวันออกเฉียงเหนือ',
  นครราชสีมา: 'ภาคตะวันออกเฉียงเหนือ',
  ขอนแก่น: 'ภาคตะวันออกเฉียงเหนือ',
  เชียงใหม่: 'ภาคเหนือ',
  ชลบุรี: 'ภาคตะวันออก',
  สงขลา: 'ภาคใต้',
  สุพรรณบุรี: 'ภาคกลาง',
}

export const placementStatusMeta: Record<PlacementStatus, { label: string, tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info', nextStep: string }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral', nextStep: 'กรอกข้อมูลให้ครบแล้วส่งคำร้อง' },
  submitted: { label: 'ส่งคำร้องแล้ว', tone: 'warning', nextStep: 'รอเจ้าหน้าที่ตรวจสอบข้อมูล' },
  returned: { label: 'ส่งกลับให้แก้ไข', tone: 'danger', nextStep: 'ตรวจเหตุผล แก้ข้อมูล แล้วส่งคำร้องอีกครั้ง' },
  batched: { label: 'รวมในชุดหนังสือแล้ว', tone: 'info', nextStep: 'รอเจ้าหน้าที่จัดทำหนังสือขอฝึกงาน' },
  'letter-issued': { label: 'ออกหนังสือแล้ว', tone: 'success', nextStep: 'ดาวน์โหลดหนังสือและนำส่งสถานประกอบการ' },
  'response-uploaded': { label: 'ส่งหนังสือตอบรับแล้ว', tone: 'info', nextStep: 'รอเจ้าหน้าที่ตรวจสอบและยืนยันสถานที่ฝึกงาน' },
  'response-returned': { label: 'หนังสือตอบรับถูกส่งกลับ', tone: 'danger', nextStep: 'ตรวจเหตุผลและอัปโหลดหนังสือตอบรับฉบับแก้ไข' },
  confirmed: { label: 'ยืนยันสถานประกอบการแล้ว', tone: 'success', nextStep: 'ติดตามวันเริ่มปฏิบัติงานตามรอบสหกิจศึกษา' },
  cancelled: { label: 'ยกเลิกคำร้อง', tone: 'neutral', nextStep: 'รายการนี้สิ้นสุดแล้ว' },
}

export const companyStatusMeta: Record<CompanyStatus, { label: string, tone: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'ตรวจสอบแล้ว', tone: 'success' },
  pending: { label: 'รอตรวจสอบ', tone: 'warning' },
  inactive: { label: 'ยุติการใช้งาน', tone: 'neutral' },
}

export const useStudentPlacements = () => {
  const { selectedCycle } = useCoopCycles()
  const { currentAccount } = useAuthPrototype()
  const companies = useState<Company[]>('mock-placement-companies', cloneCompanies)
  const requests = useState<PlacementRequest[]>('mock-placement-requests', cloneRequests)
  const findCompany = (id: string) => companies.value.find(company => company.id === id)
  const findStoredRequest = (id: string) => requests.value.find(request => request.id === id)
  const findRequest = (id: string) => {
    const request = findStoredRequest(id)
    return request?.studentId === currentAccount.value?.username ? request : undefined
  }
  const cycleRequests = computed(() => requests.value.filter(request => request.cycleId === selectedCycle.value.id
    && request.studentId === currentAccount.value?.username))
  const activeRequest = computed(() => cycleRequests.value.find(request => request.status !== 'cancelled'))
  const confirmedRequest = computed(() => cycleRequests.value.find(request => request.status === 'confirmed'))
  const confirmedCompany = computed(() => confirmedRequest.value ? findCompany(confirmedRequest.value.companyId) : undefined)
  const syncSubmittedRequest = (request: PlacementRequest) => {
    const company = findCompany(request.companyId)
    if (!company || !currentAccount.value) return
    usePlacementRequestPreview().syncPlacementRequest({
      id: request.id,
      cycleId: request.cycleId,
      studentId: request.studentId,
      studentName: currentAccount.value.name,
      companyName: company.name,
      companyLocation: company.address,
      province: company.province,
      position: request.position,
      recipientName: request.recipientName,
      letterAddress: request.letterAddress,
      appliedAt: request.appliedAt,
    })
  }
  const syncDocumentStatus = (id: string, status: Extract<PlacementStatus, 'letter-issued' | 'response-uploaded' | 'response-returned' | 'confirmed'>, returnReason?: string) => {
    const request = findStoredRequest(id)
    if (!request || request.status === status) return request
    const role = currentAccount.value?.role
    const transitionRules: Record<typeof status, { role: 'staff' | 'student', from: PlacementStatus[] }> = {
      'letter-issued': { role: 'staff', from: ['submitted', 'batched'] },
      'response-uploaded': { role: 'student', from: ['letter-issued', 'response-returned'] },
      'response-returned': { role: 'staff', from: ['response-uploaded'] },
      confirmed: { role: 'staff', from: ['response-uploaded'] },
    }
    const transition = transitionRules[status]
    if (role !== transition.role) throw new Error('ไม่มีสิทธิ์อัปเดตสถานะเอกสาร')
    if (role === 'student' && request.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์อัปเดตคำร้องของนักศึกษาคนอื่น')
    if (!transition.from.includes(request.status)) throw new Error('สถานะคำร้องไม่รองรับการดำเนินการนี้')
    const now = new Date().toISOString()
    const timelineMeta = {
      'letter-issued': ['ออกหนังสือแล้ว', 'เจ้าหน้าที่ส่งหนังสือขอความอนุเคราะห์ให้นักศึกษาดาวน์โหลดแล้ว'],
      'response-uploaded': ['ส่งหนังสือตอบรับแล้ว', 'นักศึกษาอัปโหลดหนังสือตอบรับให้เจ้าหน้าที่ตรวจสอบแล้ว'],
      'response-returned': ['ส่งหนังสือตอบรับกลับให้แก้ไข', returnReason || 'เจ้าหน้าที่ส่งหนังสือตอบรับกลับให้นักศึกษาแก้ไข'],
      confirmed: ['ยืนยันสถานประกอบการ', 'เจ้าหน้าที่ตรวจหนังสือตอบรับและยืนยันสถานที่ฝึกงานแล้ว'],
    } satisfies Record<typeof status, [string, string]>
    request.status = status
    request.returnReason = status === 'response-returned' ? returnReason : undefined
    request.updatedAt = now
    if (status === 'confirmed') {
      request.confirmedAt = now
      request.workStatus = 'not_started'
    }
    request.timeline.unshift({
      id: crypto.randomUUID(),
      title: timelineMeta[status][0],
      description: timelineMeta[status][1],
      createdAt: now,
    })
    return request
  }

  const addCompany = (value: NewCompanyValue) => {
    const company: Company = {
      id: `COM-${String(companies.value.length + 1).padStart(3, '0')}`,
      ...value,
      branch: 'ไม่ระบุ',
      region: provinceRegions[value.province] ?? 'รอระบุภูมิภาค',
      status: 'pending',
    }
    companies.value.push(company)
    return company
  }

  const saveRequest = (value: PlacementFormValue, mode: 'draft' | 'submitted', requestId?: string) => {
    if (currentAccount.value?.role !== 'student') throw new Error('ไม่มีสิทธิ์บันทึกคำร้องของนักศึกษา')
    const now = new Date().toISOString()
    const existing = requestId ? findStoredRequest(requestId) : undefined
    if (existing) {
      if (existing.studentId !== currentAccount.value.username) throw new Error('ไม่มีสิทธิ์แก้ไขคำร้องของนักศึกษาคนอื่น')
      if (!['draft', 'submitted', 'returned'].includes(existing.status)) {
        throw new Error('placement-request-not-editable')
      }
      Object.assign(existing, value, {
        status: mode,
        returnReason: undefined,
        updatedAt: now,
      })
      existing.timeline.unshift({
        id: crypto.randomUUID(),
        title: mode === 'submitted' ? 'ส่งคำร้องอีกครั้ง' : 'แก้ไขฉบับร่าง',
        description: mode === 'submitted' ? 'บันทึกข้อมูลที่แก้ไขและส่งให้เจ้าหน้าที่ตรวจสอบ' : 'บันทึกข้อมูลล่าสุดไว้เป็นฉบับร่าง',
        createdAt: now,
      })
      if (mode === 'submitted') syncSubmittedRequest(existing)
      return existing
    }

    if (selectedCycle.value.status !== 'open') {
      throw new Error('cycle-not-open')
    }

    const ongoingCycleIds = new Set(requests.value
      .filter(request => request.status !== 'cancelled'
        && !(request.status === 'confirmed' && ['completed', 'terminated'].includes(request.workStatus ?? '')))
      .map(request => request.cycleId))
    if (activeRequest.value || (ongoingCycleIds.size && !ongoingCycleIds.has(selectedCycle.value.id))) {
      throw new Error('active-placement-request-exists')
    }

    const request: PlacementRequest = {
      id: `REQ-0269-${String(requests.value.length + 21).padStart(3, '0')}`,
      studentId: currentAccount.value.username,
      cycleId: selectedCycle.value.id,
      ...value,
      status: mode,
      updatedAt: now,
      timeline: [{
        id: crypto.randomUUID(),
        title: mode === 'submitted' ? 'ส่งคำร้องแล้ว' : 'สร้างฉบับร่าง',
        description: mode === 'submitted' ? 'ส่งข้อมูลให้เจ้าหน้าที่ตรวจสอบ' : 'บันทึกข้อมูลคำร้องครั้งแรก',
        createdAt: now,
      }],
    }
    requests.value.unshift(request)
    if (mode === 'submitted') syncSubmittedRequest(request)
    return request
  }

  const cancelRequest = (id: string) => {
    const request = findStoredRequest(id)
    if (!request || !['draft', 'submitted', 'returned'].includes(request.status)) return false
    if (currentAccount.value?.role !== 'student' || request.studentId !== currentAccount.value.username) throw new Error('ไม่มีสิทธิ์ยกเลิกคำร้องนี้')
    if (request.status !== 'draft') usePlacementRequestPreview().cancelPlacementRequest(id)
    request.status = 'cancelled'
    request.updatedAt = new Date().toISOString()
    request.timeline.unshift({
      id: crypto.randomUUID(),
      title: 'ยกเลิกคำร้อง',
      description: 'นักศึกษายกเลิกคำร้องผ่านระบบ',
      createdAt: request.updatedAt,
    })
    return true
  }

  const resetPlacementData = () => {
    companies.value = cloneCompanies()
    requests.value = cloneRequests()
  }

  return { companies, requests, cycleRequests, activeRequest, confirmedRequest, confirmedCompany, findCompany, findRequest, addCompany, saveRequest, syncDocumentStatus, cancelRequest, resetPlacementData }
}
