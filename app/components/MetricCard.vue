<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  to: string
  trend?: number
  helper?: string
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'violet'
}>()

const toneClasses = {
  primary: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  error: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300'
} as const
</script>

<template>
  <NuxtLink :to="to" class="group flex min-h-32 items-center gap-4 rounded-[14px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)] dark:bg-slate-900 dark:shadow-none">
    <span class="flex size-12 shrink-0 items-center justify-center rounded-xl" :class="toneClasses[tone || 'primary']">
        <UIcon :name="icon" class="size-5.5" aria-hidden="true" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-slate-600 dark:text-slate-400">{{ label }}</p>
      <div class="mt-0.5 flex items-end justify-between gap-3">
        <p class="text-[1.75rem] font-bold tracking-[-0.03em] text-slate-950 dark:text-white">{{ value }}</p>
        <UIcon name="i-lucide-arrow-up-right" class="mb-1 size-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-600" />
      </div>
      <p v-if="helper" class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ helper }}</p>
      <span v-else-if="trend !== undefined" class="mt-1 inline-flex items-center gap-1 text-xs font-medium" :class="trend >= 0 ? 'text-emerald-600' : 'text-rose-600'">
        <UIcon :name="trend >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'" class="size-3.5" />
        {{ Math.abs(trend).toFixed(2) }}%
      </span>
    </div>
  </NuxtLink>
</template>
