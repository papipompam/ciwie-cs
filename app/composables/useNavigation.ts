import type { UserRole } from '~/types/ui'

export interface NavigationItem {
  label: string
  to: string
  icon: string
  group: 'overview' | 'master-data' | 'workflow' | 'system'
  roles: UserRole[]
}

const items: NavigationItem[] = [
  { label: 'หน้าแรก', to: '/', icon: 'i-lucide-layout-dashboard', group: 'overview', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'ข้อมูลนักศึกษา', to: '/students', icon: 'i-lucide-users', group: 'master-data', roles: ['LECTURER', 'ADMIN'] },
  { label: 'ข้อมูลสถานประกอบการ', to: '/organizations', icon: 'i-lucide-building-2', group: 'master-data', roles: ['LECTURER', 'ADMIN'] },
  { label: 'ข้อมูลอาจารย์', to: '/lecturers', icon: 'i-lucide-graduation-cap', group: 'master-data', roles: ['LECTURER', 'ADMIN'] },
  { label: 'ข้อมูลยื่นฝึกสหกิจ', to: '/applications', icon: 'i-lucide-briefcase-business', group: 'workflow', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'คำขอเอกสารส่งตัว', to: '/documents', icon: 'i-lucide-files', group: 'workflow', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'การส่งเอกสารส่งตัว', to: '/documents/manage', icon: 'i-lucide-send', group: 'workflow', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'แบบตอบรับ', to: '/responses', icon: 'i-lucide-mail-check', group: 'workflow', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'การนิเทศ', to: '/visits', icon: 'i-lucide-calendar-days', group: 'workflow', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'แบบประเมิน', to: '/evaluations', icon: 'i-lucide-clipboard-check', group: 'workflow', roles: ['LECTURER', 'ADMIN'] },
  { label: 'ค่าใช้จ่าย', to: '/expenses', icon: 'i-lucide-receipt-text', group: 'workflow', roles: ['ADMIN'] },
  { label: 'การตั้งค่า', to: '/admin', icon: 'i-lucide-settings-2', group: 'system', roles: ['ADMIN'] },
  { label: 'ประวัติการใช้งาน', to: '/audit', icon: 'i-lucide-history', group: 'system', roles: ['ADMIN'] }
]

export function useNavigation() {
  const { user } = useSession()
  const navigation = computed(() => user.value ? items.filter(item => item.roles.includes(user.value!.role)) : [])
  return { navigation }
}
