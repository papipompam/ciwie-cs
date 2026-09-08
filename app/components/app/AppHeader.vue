<script setup lang="ts">
import { Bell, ChevronDown, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from '@lucide/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

defineProps<{ sidebarCollapsed?: boolean }>()
const emit = defineEmits<{ openNavigation: [], toggleSidebar: [] }>()
const route = useRoute()
const { scenario } = useScenario()
const { roleNotifications, unreadCount, markAllAsRead, openNotification } = useNotifications()
const { logout } = useAuthPrototype()

const handleLogout = async () => {
  await logout()
  await navigateTo('/login')
}

const roleLabel = computed(() => ({
  staff: 'เจ้าหน้าที่',
  lecturer: 'อาจารย์นิเทศ',
  student: 'นักศึกษา',
}[scenario.value.role]))
const pageTitle = computed(() => {
  const path = route.path
  if (/^\/(staff|lecturer)\/companies\/new$/.test(path)) return 'เพิ่มสถานประกอบการ'
  if (/^\/(staff|lecturer)\/companies\/[^/]+$/.test(path)) return 'รายละเอียดสถานประกอบการ'
  if (/^\/(staff|lecturer)\/companies/.test(path)) return 'ข้อมูลสถานประกอบการ'
  if (path.startsWith('/lecturer/evaluations')) return route.query.type === 'company' ? 'ประเมินสถานประกอบการ' : 'ประเมินนักศึกษา'
  if (path.startsWith('/lecturer/supervision')) return 'ตารางนิเทศ'
  if (path.startsWith('/staff/applications')) return 'การสมัครสหกิจของนักศึกษา'
  if (path === '/staff/supervision') return 'ตารางนิเทศ'
  if (path.startsWith('/staff/supervision/groups/new')) return 'สร้างกลุ่มอาจารย์นิเทศ'
  if (path.startsWith('/staff/supervision/groups')) return 'จัดกลุ่มอาจารย์นิเทศ'
  if (path.startsWith('/staff/people/import')) return 'นำเข้าข้อมูลบุคคล'
  if (path.startsWith('/staff/students/new')) return 'เพิ่มนักศึกษา'
  if (/^\/staff\/students\/[^/]+$/.test(path)) return 'รายละเอียดนักศึกษา'
  if (path.startsWith('/staff/students')) return 'ข้อมูลนักศึกษา'
  if (path.startsWith('/staff/lecturers/new')) return 'เพิ่มอาจารย์'
  if (/^\/staff\/lecturers\/[^/]+$/.test(path)) return 'รายละเอียดอาจารย์'
  if (path.startsWith('/staff/lecturers')) return 'ข้อมูลอาจารย์'
  return String(route.meta.title ?? 'หน้าหลัก')
})
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-divider bg-canvas/95 backdrop-blur">
    <div class="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-control text-ink hover:bg-surface lg:hidden"
        aria-label="เปิดเมนูหลัก"
        @click="emit('openNavigation')"
      >
        <Menu :size="21" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="hidden size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink lg:grid"
        :aria-label="sidebarCollapsed ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'"
        :title="sidebarCollapsed ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'"
        @click="emit('toggleSidebar')"
      >
        <PanelLeftOpen v-if="sidebarCollapsed" :size="20" aria-hidden="true" />
        <PanelLeftClose v-else :size="20" aria-hidden="true" />
      </button>

      <div class="min-w-0 flex-1">
        <nav aria-label="เส้นทางนำทาง">
          <ol class="flex min-w-0 items-center gap-1 truncate text-xs text-muted">
            <li>CWIE BRU</li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" class="truncate">{{ pageTitle }}</li>
          </ol>
        </nav>
        <h1 class="truncate text-base font-bold text-ink sm:text-lg">{{ pageTitle }}</h1>
      </div>

      <DropdownMenuRoot>
        <DropdownMenuTrigger
          class="relative grid size-11 shrink-0 place-items-center rounded-control border border-divider text-muted hover:bg-surface hover:text-ink"
          :aria-label="unreadCount ? `การแจ้งเตือน มี ${unreadCount} รายการใหม่` : 'การแจ้งเตือน ไม่มีรายการใหม่'"
        >
          <Bell :size="19" aria-hidden="true" />
          <span v-if="unreadCount" class="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-danger text-[10px] font-semibold leading-none text-white">
            {{ unreadCount }}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent :side-offset="8" align="end" class="z-50 w-[calc(100vw-2rem)] max-w-sm rounded-panel border border-divider bg-canvas p-2 shadow-xl">
            <DropdownMenuLabel class="flex items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-ink">
              <span>การแจ้งเตือน</span>
              <button v-if="unreadCount" type="button" class="text-xs font-semibold text-info hover:underline" @click.stop="markAllAsRead">อ่านทั้งหมด</button>
            </DropdownMenuLabel>
            <DropdownMenuItem
              v-for="notification in roleNotifications.slice(0, 3)"
              :key="notification.id"
              class="cursor-pointer rounded-control px-3 py-3 outline-none data-[highlighted]:bg-surface"
              :class="notification.readAt ? '' : 'bg-info-soft'"
              @select="openNotification(notification)"
            >
              <div>
                <p class="text-sm font-medium text-ink">{{ notification.title }}</p>
                <p class="mt-1 text-xs leading-5 text-muted">{{ notification.description }}</p>
              </div>
            </DropdownMenuItem>
            <p v-if="!roleNotifications.length" class="rounded-control bg-surface px-3 py-3 text-sm text-muted">ยังไม่มีการแจ้งเตือน</p>
            <DropdownMenuItem class="mt-1 cursor-pointer rounded-control px-3 py-2 text-center text-sm font-semibold text-info outline-none data-[highlighted]:bg-surface" @select="navigateTo('/notifications')">ดูการแจ้งเตือนทั้งหมด</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <DropdownMenuRoot>
        <DropdownMenuTrigger class="flex min-h-12 items-center gap-2.5 rounded-control border border-divider bg-canvas px-3 text-left hover:bg-surface">
          <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-ink">{{ scenario.userName.slice(0, 1) }}</span>
          <span class="hidden min-w-0 sm:block">
            <span class="block max-w-40 truncate text-sm font-semibold text-ink">{{ scenario.userName }}</span>
            <span class="block text-xs text-muted">{{ roleLabel }}</span>
          </span>
          <ChevronDown class="hidden size-4 text-muted sm:block" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent :side-offset="8" align="end" class="z-50 min-w-64 rounded-panel border border-divider bg-canvas p-2 shadow-xl">
            <DropdownMenuLabel class="px-3 py-2 outline-none">
              <span class="block text-sm font-semibold text-ink">{{ scenario.userName }}</span>
              <span class="mt-0.5 block text-xs font-normal text-muted">{{ roleLabel }} · ข้อมูลจำลอง</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="my-1 h-px bg-divider" />
            <DropdownMenuItem class="flex cursor-pointer items-center gap-2 rounded-control px-3 py-2.5 text-sm text-ink outline-none data-[highlighted]:bg-surface" @select="navigateTo('/account/password')">
              <KeyRound :size="17" aria-hidden="true" />
              เปลี่ยนรหัสผ่าน
            </DropdownMenuItem>
            <DropdownMenuItem class="flex cursor-pointer items-center gap-2 rounded-control px-3 py-2.5 text-sm text-danger outline-none data-[highlighted]:bg-danger-soft" @select="handleLogout">
              <LogOut :size="17" aria-hidden="true" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  </header>
</template>
