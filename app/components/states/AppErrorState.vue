<script setup lang="ts">
import { RefreshCw, TriangleAlert } from '@lucide/vue'

interface Props { title?: string, description?: string }
withDefaults(defineProps<Props>(), {
  title: 'ไม่สามารถโหลดข้อมูลได้',
  description: 'โปรดลองอีกครั้ง หากยังพบปัญหาให้ติดต่อเจ้าหน้าที่ดูแลระบบ',
})
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex min-h-64 flex-col items-center justify-center rounded-panel border border-danger/25 bg-danger-soft p-8 text-center">
    <div class="mb-4 grid size-12 place-items-center rounded-full bg-white text-danger">
      <TriangleAlert :size="22" aria-hidden="true" />
    </div>
    <h2 class="text-base font-semibold text-ink">{{ title }}</h2>
    <p class="mt-1 max-w-md text-sm leading-6 text-muted">{{ description }}</p>
    <UiButton class="mt-5" variant="secondary" :icon="RefreshCw" @click="emit('retry')">ลองอีกครั้ง</UiButton>
  </div>
</template>
