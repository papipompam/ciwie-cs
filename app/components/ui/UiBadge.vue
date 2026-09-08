<script setup lang="ts">
interface Props {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'interview'
}

withDefaults(defineProps<Props>(), { tone: 'neutral' })
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="{
      'bg-surface text-muted': tone === 'neutral',
      'bg-success-soft text-success': tone === 'success',
      'bg-warning-soft text-warning': tone === 'warning',
      'bg-danger-soft text-danger': tone === 'danger',
      'bg-info-soft text-info': tone === 'info',
      'bg-interview-soft text-interview': tone === 'interview',
    }"
  >
    <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    <slot />
  </span>
</template>
