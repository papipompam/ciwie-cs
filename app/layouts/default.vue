<script setup lang="ts">
import { X } from '@lucide/vue'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot } from 'reka-ui'

const mobileNavigationOpen = ref(false)
const sidebarCollapsed = useState('app-sidebar-collapsed', () => false)
const route = useRoute()
const isDevelopment = import.meta.dev
const hasDashboardToolbar = computed(() => route.path.startsWith('/staff/supervision/groups')
  || route.path === '/staff/supervision'
  || route.path.startsWith('/staff/applications')
  || route.path.startsWith('/lecturer/evaluations')
  || route.path.startsWith('/lecturer/applications')
  || route.path.startsWith('/lecturer/students')
  || route.path.startsWith('/lecturer/supervision'))

watch(() => route.fullPath, () => {
  mobileNavigationOpen.value = false
})
</script>

<template>
  <div class="min-h-dvh bg-surface">
    <a href="#main-content" class="sr-only z-[60] rounded-control bg-primary px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
      ข้ามไปยังเนื้อหาหลัก
    </a>
    <div
      class="fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block"
      :class="sidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <AppSidebar :collapsed="sidebarCollapsed" />
    </div>

    <DialogRoot v-model:open="mobileNavigationOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/45 lg:hidden" />
        <DialogContent class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] outline-none lg:hidden" aria-label="เมนูหลัก">
          <AppSidebar @navigate="mobileNavigationOpen = false" />
          <button
            type="button"
            class="absolute top-4 right-3 grid size-10 place-items-center rounded-control text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="ปิดเมนูหลัก"
            title="ปิดเมนูหลัก"
            @click="mobileNavigationOpen = false"
          >
            <X :size="19" aria-hidden="true" />
          </button>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="transition-[padding] duration-200" :class="sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'">
      <AppHeader
        :sidebar-collapsed="sidebarCollapsed"
        @open-navigation="mobileNavigationOpen = true"
        @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
      />
      <DashboardToolbar v-if="hasDashboardToolbar" />
      <main id="main-content" class="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8"><slot /></main>
    </div>

    <ClientOnly>
      <ScenarioPanel v-if="isDevelopment" />
      <AppToaster />
    </ClientOnly>
  </div>
</template>
