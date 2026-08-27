<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: true })
const route = useRoute()
const colorMode = useColorMode()
const { navigation } = useNavigation()
const { user, logout } = useSession()

const groupLabels = { overview: '', 'master-data': '', workflow: '', system: '' } as const

const roleLabel = computed(() => ({
  STUDENT: 'นักศึกษา',
  LECTURER: 'อาจารย์',
  ADMIN: 'ผู้ดูแลระบบ'
})[user.value?.role || 'ADMIN'])

const userAvatar = computed(() => ({
  text: user.value?.displayName?.slice(0, 1) || 'U',
  alt: user.value?.displayName || 'ผู้ใช้งาน'
}))

const userItems = computed<DropdownMenuItem[][]>(() => [
  [{
    label: user.value?.displayName || 'ผู้ใช้งาน',
    description: user.value?.email || roleLabel.value,
    avatar: userAvatar.value,
    type: 'label'
  }],
  [{
    label: 'การแสดงผล',
    icon: 'i-lucide-sun-moon',
    children: [
      {
        label: 'สว่าง',
        icon: 'i-lucide-sun',
        type: 'checkbox',
        checked: colorMode.value === 'light',
        onUpdateChecked: (checked: boolean) => { if (checked) colorMode.preference = 'light' },
        onSelect: (event: Event) => event.preventDefault()
      },
      {
        label: 'มืด',
        icon: 'i-lucide-moon',
        type: 'checkbox',
        checked: colorMode.value === 'dark',
        onUpdateChecked: (checked: boolean) => { if (checked) colorMode.preference = 'dark' },
        onSelect: (event: Event) => event.preventDefault()
      },
      {
        label: 'ตามระบบ',
        icon: 'i-lucide-monitor',
        type: 'checkbox',
        checked: colorMode.preference === 'system',
        onUpdateChecked: (checked: boolean) => { if (checked) colorMode.preference = 'system' },
        onSelect: (event: Event) => event.preventDefault()
      }
    ]
  }],
  [{ label: 'ออกจากระบบ', icon: 'i-lucide-log-out', color: 'error', onSelect: logout }]
])

const closeOnMobile = () => {
  if (import.meta.client && window.matchMedia('(max-width: 1023px)').matches) open.value = false
}

const childItems = (item: { to: string }): NavigationMenuItem[] | undefined => {
  if (item.to === '/applications') {
    return [
      { label: 'ข้อมูลการยื่นฝึก', to: '/applications', active: route.path.startsWith('/applications'), onSelect: closeOnMobile },
      { label: 'คำร้องขอเอกสารขออนุญาต', to: '/documents', active: route.path === '/documents', onSelect: closeOnMobile },
      { label: 'การส่งเอกสารส่งตัว', to: '/documents/manage', active: route.path.startsWith('/documents/manage'), onSelect: closeOnMobile },
      { label: 'แบบตอบรับเอกสารขออนุญาต', to: '/responses', active: route.path.startsWith('/responses'), onSelect: closeOnMobile }
    ]
  }

  if (item.to === '/evaluations') {
    return [
      { label: 'การประเมินผล', to: '/evaluations', active: route.path === '/evaluations', onSelect: closeOnMobile },
      { label: 'ประเมินนักศึกษา', disabled: true },
      { label: 'ประเมินสถานประกอบการ', disabled: true }
    ]
  }

  if (item.to === '/admin') {
    return [
      { label: 'จัดการบัญชี', to: '/admin', active: route.path === '/admin', onSelect: closeOnMobile },
      { label: 'การแจ้งเตือน', to: '/notifications', active: route.path === '/notifications', onSelect: closeOnMobile },
      { label: 'Export ข้อมูล', disabled: true },
      { label: 'ถังขยะ', disabled: true }
    ]
  }
}

const getItems = (state: 'collapsed' | 'expanded') => Object.entries(groupLabels)
  .map(([group, label]) => {
    const items: NavigationMenuItem[] = navigation.value
      .filter(item => item.group === group)
      .filter(item => !['/documents', '/documents/manage', '/responses'].includes(item.to))
      .map((item) => {
        const children = childItems(item)
        const active = route.path === item.to
          || (item.to !== '/' && route.path.startsWith(`${item.to}/`))
          || (item.to === '/applications' && ['/documents', '/responses'].some(path => route.path === path || route.path.startsWith(`${path}/`)))
          || (item.to === '/admin' && route.path === '/notifications')

        return {
          label: item.to === '/applications' ? 'การฝึกสหกิจ' : item.label,
          ...(children ? { children, defaultOpen: active } : { to: item.to, onSelect: closeOnMobile }),
          icon: item.icon,
          active,
          tooltip: { text: item.label, side: 'right' }
        }
      })

    return state === 'expanded' && label && items.length
      ? [{ label, type: 'label' as const }, ...items]
      : items
  })
  .filter(group => group.length) satisfies NavigationMenuItem[][]
</script>

<template>
  <USidebar
    v-model:open="open"
    collapsible="icon"
    mode="slideover"
    rail
    close
    title="เมนูหลัก"
    description="ระบบบริหารจัดการสหกิจศึกษา"
    :ui="{
      root: 'z-30',
      container: 'h-full border-r border-slate-200 dark:border-slate-800 lg:w-72 lg:max-w-72',
      inner: 'bg-default divide-transparent',
      header: 'border-b border-default p-3',
      body: 'px-3 py-3',
      footer: 'border-t border-default p-3'
    }"
  >
    <template #header="{ state }">
      <div class="flex min-h-14 items-center overflow-hidden px-1">
        <img
          v-if="state === 'expanded'"
          src="/images/cs-buu-logo.png"
          alt="สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยราชภัฏบุรีรัมย์"
          class="h-12 w-full object-contain object-left"
        >
        <img
          v-else
          src="/images/cs-mark.png"
          alt="สาขาวิชาวิทยาการคอมพิวเตอร์"
          class="h-9 w-11 object-contain"
        >
      </div>
    </template>

    <template #default="{ state }">
      <nav aria-label="เมนูหลัก">
        <UNavigationMenu
          :key="state"
          class="admin-navigation"
          :items="getItems(state)"
          orientation="vertical"
          :collapsed="state === 'collapsed'"
          color="primary"
          variant="pill"
          tooltip
          :ui="{
            root: 'w-full',
            list: 'gap-1',
            label: 'hidden',
            link: 'min-h-11 overflow-hidden rounded-lg px-3 py-2.5 data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
            linkLabel: 'truncate text-sm font-medium',
            linkLeadingIcon: 'size-5 shrink-0',
            childList: 'ms-5 border-s border-slate-200 ps-2 dark:border-slate-700',
            childLink: 'min-h-9 rounded-md px-3 py-2 text-xs',
            childLinkLabel: 'truncate'
          }"
        />
      </nav>
    </template>

    <template #footer="{ state }">
      <div class="space-y-2">
        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'center', side: 'top', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-60' }"
        >
          <UButton
            :avatar="userAvatar"
            :label="state === 'expanded' ? user?.displayName || 'ผู้ใช้งาน' : undefined"
            :description="state === 'expanded' ? roleLabel : undefined"
            :trailing-icon="state === 'expanded' ? 'i-lucide-chevrons-up-down' : undefined"
            color="neutral"
            variant="outline"
            square
            class="w-full overflow-hidden data-[state=open]:bg-elevated"
            :ui="{ base: 'justify-start', leadingAvatar: 'shrink-0', label: 'truncate text-left', trailingIcon: 'ms-auto text-dimmed' }"
          />
        </UDropdownMenu>
      </div>
    </template>
  </USidebar>
</template>
