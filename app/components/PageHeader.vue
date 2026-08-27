<script setup lang="ts">
defineProps<{ title: string, description?: string, icon?: string }>()
</script>

<template>
  <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
    <div class="flex min-w-0 items-start gap-3">
      <div>
        <nav class="mb-1 flex items-center gap-1.5 text-xs text-slate-400" aria-label="เส้นทางนำทาง">
          <NuxtLink to="/" class="transition hover:text-indigo-600">หน้าหลัก</NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3" />
          <span aria-current="page">{{ title }}</span>
        </nav>
        <h1 class="text-[1.65rem] font-bold tracking-[-0.02em] text-slate-950 dark:text-white">{{ title }}</h1>
        <p v-if="description" class="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{{ description }}</p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2"><slot /></div>
  </header>
</template>
