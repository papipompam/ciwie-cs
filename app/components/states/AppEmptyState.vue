<script setup lang="ts">
import { Inbox } from '@lucide/vue'

interface Props { title?: string, description?: string }
withDefaults(defineProps<Props>(), {
  title: 'ยังไม่มีข้อมูล',
  description: 'ข้อมูลที่สร้างหรือได้รับมอบหมายจะแสดงในส่วนนี้',
})
</script>

<template>
  <div class="flex min-h-64 flex-col items-center justify-center rounded-panel border border-dashed border-divider bg-canvas p-8 text-center">
    <div class="mb-4 grid size-12 place-items-center rounded-full bg-surface text-muted">
      <Inbox :size="22" aria-hidden="true" />
    </div>
    <h2 class="text-base font-semibold text-ink">{{ title }}</h2>
    <p class="mt-1 max-w-md text-sm leading-6 text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>
