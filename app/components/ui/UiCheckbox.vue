<script setup lang="ts">
import { Check, Minus } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

interface Props {
  modelValue: boolean | 'indeterminate'
  label: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), { disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean | 'indeterminate'] }>()
</script>

<template>
  <CheckboxRoot
    :model-value="modelValue"
    :disabled="disabled"
    class="group inline-grid size-8 shrink-0 place-items-center rounded-control disabled:cursor-not-allowed disabled:opacity-55"
    :aria-label="label"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <span class="grid size-5 place-items-center rounded border border-divider bg-canvas group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=indeterminate]:border-primary group-data-[state=indeterminate]:bg-primary">
      <CheckboxIndicator class="text-ink">
        <Minus v-if="modelValue === 'indeterminate'" :size="14" :stroke-width="2.5" aria-hidden="true" />
        <Check v-else :size="14" :stroke-width="2.5" aria-hidden="true" />
      </CheckboxIndicator>
    </span>
  </CheckboxRoot>
</template>
