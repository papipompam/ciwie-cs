<script setup lang="ts">
import { Building2, GraduationCap, Presentation } from '@lucide/vue'

const route = useRoute()
const items = [
  { label: 'นักศึกษา', to: '/staff/students', icon: GraduationCap },
  { label: 'อาจารย์', to: '/staff/lecturers', icon: Presentation },
  { label: 'สถานประกอบการ', to: '/staff/companies', icon: Building2 },
]
</script>

<template>
  <nav class="mb-6 grid overflow-hidden rounded-panel border border-divider bg-canvas sm:inline-grid sm:grid-cols-3" aria-label="เลือกประเภทข้อมูลพื้นฐาน">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex min-h-12 items-center justify-center gap-2 border-b border-divider px-5 text-sm font-semibold transition-colors last:border-b-0 hover:bg-surface sm:border-r sm:border-b-0 sm:last:border-r-0"
      :class="route.path.startsWith(item.to) ? 'bg-warning-soft text-ink' : 'text-muted'"
      :aria-current="route.path.startsWith(item.to) ? 'page' : undefined"
    >
      <component :is="item.icon" :size="18" aria-hidden="true" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>
