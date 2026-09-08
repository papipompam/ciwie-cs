<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

export interface TabOption { value: string, label: string, count?: number }

interface Props {
  tabs: TabOption[]
  defaultValue: string
  label: string
  variant?: 'panel' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'panel',
})

const contentClass = computed(() => props.variant === 'plain'
  ? 'mt-4 outline-none'
  : 'mt-4 rounded-control border border-divider p-4 text-sm text-muted outline-none')
</script>

<template>
  <TabsRoot :default-value="defaultValue">
    <TabsList class="inline-flex max-w-full overflow-x-auto rounded-control border border-divider bg-surface p-1" :aria-label="label">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="min-h-10 shrink-0 rounded-md px-4 text-sm font-semibold text-muted data-[state=active]:bg-canvas data-[state=active]:text-ink data-[state=active]:shadow-sm"
      >
        <span>{{ tab.label }}</span>
        <span v-if="tab.count !== undefined" class="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-ink">{{ tab.count }}</span>
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="tab in tabs" :key="tab.value" :value="tab.value" :class="contentClass">
      <slot :name="tab.value" />
    </TabsContent>
  </TabsRoot>
</template>
