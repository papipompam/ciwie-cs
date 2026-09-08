<script setup lang="ts">
export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface Props {
  modelValue: string
  label: string
  options: RadioOption[]
  columns?: 1 | 2
}

withDefaults(defineProps<Props>(), { columns: 2 })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const name = useId()
</script>

<template>
  <fieldset>
    <legend class="text-sm font-semibold text-ink">{{ label }}</legend>
    <div class="mt-2 grid gap-2" :class="columns === 2 ? 'grid-cols-2' : 'grid-cols-1'">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex min-h-11 items-start gap-2 rounded-control border border-divider px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-warning-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55"
      >
        <input
          :checked="modelValue === option.value"
          :name="name"
          :value="option.value"
          :disabled="option.disabled"
          type="radio"
          class="mt-0.5 accent-amber-500"
          @change="emit('update:modelValue', option.value)"
        >
        <span>
          <span class="block font-medium text-ink">{{ option.label }}</span>
          <span v-if="option.description" class="mt-0.5 block text-xs text-muted">{{ option.description }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>
