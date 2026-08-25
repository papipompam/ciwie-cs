import type { ListPageDefinition } from '~/types/ui'

const commonActions = [
  { key: 'view', label: 'ดู', icon: 'i-lucide-eye' }
]

const definitions: Record<string, ListPageDefinition> = {
  students: {
    title: 'นักศึกษา', description: 'ค้นหา ตรวจสอบประวัติ และนำเข้ารายชื่อนักศึกษา', endpoint: '/api/students', icon: 'i-lucide-users', roles: ['LECTURER', 'ADMIN'], exportable: true, exportKind: 'STUDENT_ROSTER', exportRoles: ['LECTURER', 'ADMIN'],
    columns: [{ key: 'studentCode', label: 'รหัสนักศึกษา', sortable: true }, { key: 'displayName', label: 'ชื่อ–นามสกุล', sortable: true }, { key: 'coopTerm', label: 'ภาคสหกิจ', sortable: true }, { key: 'status', label: 'สถานะ', sortable: true }],
    filters: [{ key: 'status', label: 'สถานะ', options: [{ label: 'ใช้งาน', value: 'ACTIVE' }, { label: 'ระงับ', value: 'SUSPENDED' }] }], actions: commonActions,
    primaryAction: { label: 'นำเข้ารายชื่อ', icon: 'i-lucide-file-up' }
  },
  applications: {
    title: 'ใบสมัครงาน', description: 'ติดตามสถานะการสมัครและหลักฐาน โดยทุกการแก้สถานะมีประวัติ', endpoint: '/api/applications', icon: 'i-lucide-briefcase-business', roles: ['STUDENT', 'LECTURER', 'ADMIN'],
    columns: [{ key: 'studentName', label: 'นักศึกษา', sortable: true }, { key: 'organizationName', label: 'สถานประกอบการ', sortable: true }, { key: 'workSiteName', label: 'สถานที่ปฏิบัติงาน' }, { key: 'status', label: 'สถานะ', sortable: true }, { key: 'updatedAt', label: 'อัปเดต', sortable: true }],
    filters: [{ key: 'status', label: 'สถานะ', options: ['SUBMITTED', 'WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED'].map(value => ({ label: value, value })) }], actions: [...commonActions, { key: 'transition', label: 'เปลี่ยนสถานะ', icon: 'i-lucide-git-branch', capability: 'transition' }],
    primaryAction: { label: 'เพิ่มใบสมัคร', icon: 'i-lucide-plus', roles: ['STUDENT'] }
  },
  documents: {
    title: 'คำขอและชุดเอกสาร', description: 'คำขอรายคนแยกจากชุดเอกสารหลายคน พร้อม revision และการส่งมอบ', endpoint: '/api/document-requests', icon: 'i-lucide-files', roles: ['STUDENT', 'LECTURER', 'ADMIN'],
    columns: [{ key: 'requestNumber', label: 'เลขคำขอ', sortable: true }, { key: 'studentName', label: 'นักศึกษา', sortable: true }, { key: 'workSiteName', label: 'สถานที่ฝึกงาน' }, { key: 'batchNumber', label: 'ชุดเอกสาร' }, { key: 'status', label: 'สถานะ', sortable: true }],
    filters: [{ key: 'status', label: 'สถานะ', options: ['REQUESTED', 'IN_PROGRESS', 'READY_TO_SEND'].map(value => ({ label: value, value })) }], actions: commonActions,
    primaryAction: { label: 'สร้างคำขอ', icon: 'i-lucide-file-plus-2' }
  },
  responses: {
    title: 'แบบตอบรับร่วม', description: 'ผู้แทนนักศึกษากรอกผลรายคนเป็นร่าง และอาจารย์หรือเจ้าหน้าที่ยืนยันทั้งชุด', endpoint: '/api/responses', icon: 'i-lucide-mail-check', roles: ['STUDENT', 'LECTURER', 'ADMIN'],
    columns: [{ key: 'batchNumber', label: 'ชุดเอกสาร', sortable: true }, { key: 'workSiteName', label: 'สถานประกอบการ', sortable: true }, { key: 'memberCount', label: 'จำนวนคน' }, { key: 'status', label: 'สถานะ', sortable: true }, { key: 'updatedAt', label: 'อัปเดต', sortable: true }],
    filters: [{ key: 'status', label: 'สถานะ', options: ['DRAFT', 'PENDING_REVIEW', 'CONFIRMED'].map(value => ({ label: value, value })) }], actions: [...commonActions, { key: 'review', label: 'ตรวจผล', icon: 'i-lucide-list-checks', capability: 'review' }],
    primaryAction: { label: 'อัปโหลดแบบตอบรับ', icon: 'i-lucide-file-up', roles: ['STUDENT'] }
  },
  placements: {
    title: 'สถานที่ฝึกงาน', description: 'สถานที่ฝึกงานปัจจุบันหนึ่งแห่งต่อคนและภาคสหกิจ พร้อมประวัติการแก้ไข', endpoint: '/api/placements', icon: 'i-lucide-map-pin-check', roles: ['STUDENT', 'LECTURER', 'ADMIN'], exportable: true, exportKind: 'INTERNSHIP', exportRoles: ['LECTURER', 'ADMIN'],
    columns: [{ key: 'studentName', label: 'นักศึกษา', sortable: true }, { key: 'organizationName', label: 'สถานประกอบการ', sortable: true }, { key: 'workSiteName', label: 'สถานที่ปฏิบัติงาน' }, { key: 'coopTerm', label: 'ภาคสหกิจ', sortable: true }, { key: 'confirmedAt', label: 'ยืนยันเมื่อ', sortable: true }], actions: [...commonActions, { key: 'correct', label: 'แก้ไข', icon: 'i-lucide-file-pen-line', capability: 'correct' }]
  },
  visits: {
    title: 'การนิเทศ', description: 'วางแผนรอบนิเทศ ป้องกันเวลาชน และติดตาม coverage ที่คำนวณจาก placement', endpoint: '/api/visits', icon: 'i-lucide-calendar-days', roles: ['STUDENT', 'LECTURER', 'ADMIN'],
    columns: [{ key: 'round', label: 'รอบ', sortable: true }, { key: 'visitDate', label: 'วันที่', sortable: true }, { key: 'period', label: 'ช่วงเวลา', sortable: true }, { key: 'workSiteName', label: 'สถานที่' }, { key: 'lecturers', label: 'อาจารย์' }, { key: 'status', label: 'สถานะ', sortable: true }],
    filters: [{ key: 'coverage', label: 'ความครอบคลุม', options: [{ label: 'ยังไม่จัดตาราง', value: 'UNSCHEDULED' }, { label: 'เกินกำหนด', value: 'OVERDUE' }, { label: 'ขาดผล', value: 'MISSING_RESULT' }] }], actions: [...commonActions, { key: 'reschedule', label: 'เลื่อนนัด', icon: 'i-lucide-calendar-clock', capability: 'reschedule' }],
    primaryAction: { label: 'จัดตารางนิเทศ', icon: 'i-lucide-calendar-plus' }
  },
  evaluations: {
    title: 'การประเมิน', description: 'ประเมินนักศึกษาและสถานประกอบการแยกรอบด้วย template version ที่เผยแพร่แล้ว', endpoint: '/api/evaluations', icon: 'i-lucide-clipboard-check', roles: ['LECTURER', 'ADMIN'],
    columns: [{ key: 'round', label: 'รอบ', sortable: true }, { key: 'subjectType', label: 'หัวข้อ', sortable: true }, { key: 'workSiteName', label: 'สถานประกอบการ' }, { key: 'templateVersion', label: 'แบบประเมิน' }, { key: 'status', label: 'สถานะ', sortable: true }],
    filters: [{ key: 'status', label: 'สถานะ', options: [{ label: 'ร่าง', value: 'DRAFT' }, { label: 'ส่งแล้ว', value: 'SUBMITTED' }] }], actions: [...commonActions, { key: 'evaluate', label: 'ประเมิน', icon: 'i-lucide-clipboard-pen-line', capability: 'edit' }]
  },
  expenses: {
    title: 'ค่าใช้จ่าย', description: 'บันทึกค่าเดินทาง ที่พัก และอาหารแยกรอบ (เฉพาะเจ้าหน้าที่)', endpoint: '/api/expenses', icon: 'i-lucide-receipt-text', roles: ['ADMIN'], exportable: true, exportKind: 'EXPENSE', exportRoles: ['ADMIN'],
    columns: [{ key: 'round', label: 'รอบ', sortable: true }, { key: 'visitDate', label: 'วันที่', sortable: true }, { key: 'workSiteName', label: 'สถานที่' }, { key: 'travelDays', label: 'จำนวนวัน' }, { key: 'travel', label: 'เดินทาง' }, { key: 'lodging', label: 'ที่พัก' }, { key: 'meal', label: 'อาหาร' }, { key: 'total', label: 'รวม', sortable: true }], actions: [...commonActions, { key: 'correct', label: 'แก้ไข', icon: 'i-lucide-file-pen-line', capability: 'correct' }],
    primaryAction: { label: 'เพิ่มค่าใช้จ่าย', icon: 'i-lucide-plus' }
  },
  audit: {
    title: 'ประวัติระบบ', description: 'ตรวจสอบผู้กระทำ เวลา เหตุผล และค่าก่อน–หลังของรายการสำคัญ', endpoint: '/api/audit', icon: 'i-lucide-shield-check', roles: ['ADMIN'],
    columns: [{ key: 'occurredAt', label: 'เวลา', sortable: true }, { key: 'actorName', label: 'ผู้กระทำ', sortable: true }, { key: 'action', label: 'เหตุการณ์', sortable: true }, { key: 'entityType', label: 'ชนิดข้อมูล' }, { key: 'entityId', label: 'รหัสอ้างอิง' }, { key: 'reason', label: 'เหตุผล' }], actions: commonActions
  }
}

export function useWorkflowDefinition(key: 'students' | 'applications' | 'documents' | 'responses' | 'placements' | 'visits' | 'evaluations' | 'expenses' | 'audit'): ListPageDefinition {
  return definitions[key]!
}
