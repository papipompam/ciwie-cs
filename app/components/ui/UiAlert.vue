<script setup lang="ts">
import { CircleAlert, CircleCheck, Info } from '@lucide/vue'

interface Props {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title: string
}

const props = withDefaults(defineProps<Props>(), { tone: 'info' })
const icon = computed(() => props.tone === 'success' ? CircleCheck : props.tone === 'info' ? Info : CircleAlert)
</script>

<template>
  <div
    class="flex gap-3 rounded-control border p-4 text-sm"
    :class="{
      'border-blue-200 bg-info-soft text-info': tone === 'info',
      'border-green-200 bg-success-soft text-success': tone === 'success',
      'border-amber-200 bg-warning-soft text-warning': tone === 'warning',
      'border-red-200 bg-danger-soft text-danger': tone === 'danger',
    }"
    role="status"
  >
    <component :is="icon" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <div>
      <p class="font-semibold">{{ title }}</p>
      <div class="mt-0.5 text-current/85"><slot /></div>
    </div>
  </div>
</template>
