export type NotificationRole = 'staff' | 'lecturer' | 'student'
export type NotificationTone = 'info' | 'warning' | 'success'

export interface AppNotification {
  id: string
  role: NotificationRole
  title: string
  description: string
  createdAt: string
  to: string
  tone: NotificationTone
  readAt: string | null
}

const notificationsSeed: AppNotification[] = [
  { id: 'NT-001', role: 'student', title: 'เผยแพร่ตารางนิเทศแล้ว', description: 'นิเทศครั้งที่ 1 วันที่ 2 ก.ย. 2569 ช่วงเช้า', createdAt: '2026-08-30T15:25:00+07:00', to: '/student/supervision', tone: 'info', readAt: null },
  { id: 'NT-002', role: 'student', title: 'สถานประกอบการได้รับการยืนยันแล้ว', description: 'บริษัท สยามเทค โซลูชัน จำกัด ได้รับการยืนยันเป็นสถานที่ฝึกงานของคุณ', createdAt: '2026-08-28T10:15:00+07:00', to: '/student/applications', tone: 'success', readAt: '2026-08-28T11:00:00+07:00' },
  { id: 'NT-003', role: 'lecturer', title: 'มีคำร้องใหม่รอตรวจ', description: 'มีคำร้องสถานประกอบการใหม่ 3 รายการในรอบภาคเรียนที่ 2/2569', createdAt: '2026-08-30T14:40:00+07:00', to: '/lecturer/placements', tone: 'warning', readAt: null },
  { id: 'NT-004', role: 'lecturer', title: 'ตารางนิเทศมีการเปลี่ยนแปลง', description: 'รายการ SA-001 กำหนดนิเทศวันที่ 2 ก.ย. 2569 ช่วงเช้า', createdAt: '2026-08-30T13:20:00+07:00', to: '/lecturer/supervision/SA-001', tone: 'info', readAt: null },
  { id: 'NT-005', role: 'staff', title: 'ยังมีสถานประกอบการที่ไม่ได้จัดกลุ่ม', description: 'เหลือ 6 สถานประกอบการที่ยังไม่มีกลุ่มอาจารย์รับผิดชอบ', createdAt: '2026-08-30T12:10:00+07:00', to: '/staff/supervision/groups', tone: 'warning', readAt: null },
]

export const useNotifications = () => {
  const { scenario, recordEvent } = useScenario()
  const notifications = useState<AppNotification[]>('app-notifications-v1', () => structuredClone(notificationsSeed))
  const roleNotifications = computed(() => notifications.value
    .filter(item => item.role === scenario.value.role)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const unreadCount = computed(() => roleNotifications.value.filter(item => !item.readAt).length)

  const markAsRead = (id: string) => {
    const notification = notifications.value.find(item => item.id === id && item.role === scenario.value.role)
    if (!notification || notification.readAt) return
    notification.readAt = new Date().toISOString()
    recordEvent(`อ่านการแจ้งเตือน: ${notification.title}`)
  }
  const markAllAsRead = () => {
    const unread = roleNotifications.value.filter(item => !item.readAt)
    if (!unread.length) return
    const readAt = new Date().toISOString()
    unread.forEach((item) => { item.readAt = readAt })
    recordEvent(`อ่านการแจ้งเตือนทั้งหมด ${unread.length} รายการ`)
  }
  const openNotification = async (notification: AppNotification) => {
    markAsRead(notification.id)
    await navigateTo(notification.to)
  }

  return { notifications, roleNotifications, unreadCount, markAsRead, markAllAsRead, openNotification }
}
