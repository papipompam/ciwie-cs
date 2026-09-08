<script setup lang="ts">
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'

interface Props {
  title: string
  description?: string
  open?: boolean
  closeOnConfirm?: boolean
  size?: 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  open: undefined,
  closeOnConfirm: true,
  size: 'md',
})
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
const internalOpen = ref(props.open ?? false)
const setOpen = (value: boolean) => {
  internalOpen.value = value
  emit('update:open', value)
}
const sizeClass = computed(() => ({
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
})[props.size])

watch(() => props.open, (value) => {
  if (value !== undefined && value !== internalOpen.value) internalOpen.value = value
})

</script>

<template>
  <DialogRoot :open="internalOpen" @update:open="setOpen">
    <DialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/45" />
      <DialogContent class="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-divider bg-canvas p-6 shadow-2xl outline-none" :class="sizeClass">
        <DialogTitle class="pr-10 text-lg font-bold text-ink">{{ title }}</DialogTitle>
        <DialogDescription v-if="description" class="mt-2 text-sm leading-6 text-muted">{{ description }}</DialogDescription>
        <DialogClose class="absolute top-4 right-4 grid size-9 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink" aria-label="ปิดกล่องข้อความ">
          <X :size="18" aria-hidden="true" />
        </DialogClose>
        <div v-if="$slots.default" class="mt-5"><slot /></div>
        <div v-if="$slots.cancel || $slots.confirm" class="mt-6 flex flex-wrap justify-end gap-2">
          <DialogClose v-if="$slots.cancel" as-child><slot name="cancel" /></DialogClose>
          <DialogClose v-if="$slots.confirm && props.closeOnConfirm" as-child><slot name="confirm" /></DialogClose>
          <slot v-else-if="$slots.confirm" name="confirm" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
