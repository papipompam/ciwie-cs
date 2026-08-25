import type { UserRole } from '~/types/ui'

export interface NavigationItem {
  label: string
  to: string
  icon: string
  roles: UserRole[]
}

const items: NavigationItem[] = [
  { label: 'ภาพรวม', to: '/', icon: 'i-lucide-layout-dashboard', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'จัดการระบบ', to: '/admin', icon: 'i-lucide-settings-2', roles: ['ADMIN'] },
  { label: 'นักศึกษา', to: '/students', icon: 'i-lucide-users', roles: ['LECTURER', 'ADMIN'] },
  { label: 'ใบสมัครงาน', to: '/applications', icon: 'i-lucide-briefcase-business', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'คำขอเอกสาร', to: '/documents', icon: 'i-lucide-files', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'การนำส่งเอกสาร', to: '/documents/manage', icon: 'i-lucide-folder-cog', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'แบบตอบรับ', to: '/responses', icon: 'i-lucide-mail-check', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'สถานที่ฝึกงาน', to: '/placements', icon: 'i-lucide-map-pin-check', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'การนิเทศ', to: '/visits', icon: 'i-lucide-calendar-days', roles: ['STUDENT', 'LECTURER', 'ADMIN'] },
  { label: 'การประเมิน', to: '/evaluations', icon: 'i-lucide-clipboard-check', roles: ['LECTURER', 'ADMIN'] },
  { label: 'ค่าใช้จ่าย', to: '/expenses', icon: 'i-lucide-receipt-text', roles: ['ADMIN'] },
  { label: 'ประวัติระบบ', to: '/audit', icon: 'i-lucide-shield-check', roles: ['ADMIN'] }
]

export function useNavigation() {
  const { user } = useSession()
  const navigation = computed(() => user.value ? items.filter(item => item.roles.includes(user.value!.role)) : [])
  return { navigation }
}
