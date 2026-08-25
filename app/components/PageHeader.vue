<script setup lang="ts">
defineProps<{ title: string, description?: string, icon?: string }>()
</script>

<template>
  <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div class="flex min-w-0 items-start gap-3">
      <div v-if="icon" class="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
        <UIcon :name="icon" class="size-6" aria-hidden="true" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ title }}</h1>
        <p v-if="description" class="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{{ description }}</p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2"><slot /></div>
  </header>
</template>

