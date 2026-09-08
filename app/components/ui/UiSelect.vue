<script setup lang="ts">
import { Check, ChevronDown, ChevronUp } from '@lucide/vue'
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: string
  options: SelectOption[]
  placeholder?: string
  label: string
  labelVisible?: boolean
  help?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'เลือกรายการ',
  labelVisible: true,
  help: undefined,
  error: undefined,
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const updateValue = (value: string | number | bigint | Record<string, unknown> | null) => {
  emit('update:modelValue', value == null ? '' : String(value))
}

const id = useId()
const helpId = computed(() => props.help ? `${id}-help` : undefined)
const errorId = computed(() => props.error ? `${id}-error` : undefined)
const describedBy = computed(() => [helpId.value, errorId.value].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div>
    <label :id="`${id}-label`" :class="labelVisible ? 'block text-sm font-semibold text-ink' : 'sr-only'">
      {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>
    <SelectRoot :model-value="modelValue" :disabled="disabled" @update:model-value="updateValue">
      <SelectTrigger
        :id="id"
        class="flex min-h-11 w-full items-center justify-between gap-3 rounded-control border bg-canvas px-3 text-left text-sm font-normal text-ink transition-colors data-[placeholder]:text-muted disabled:cursor-not-allowed disabled:opacity-55"
        :class="[labelVisible && 'mt-1.5', error ? 'border-danger' : 'border-divider hover:border-gray-300']"
        :aria-labelledby="`${id}-label`"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
      >
        <SelectValue :placeholder="placeholder" />
        <SelectIcon class="shrink-0 text-muted">
          <ChevronDown :size="18" aria-hidden="true" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          position="popper"
          :side-offset="6"
          class="z-[90] min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-panel border border-divider bg-canvas p-1.5 shadow-xl"
        >
          <SelectScrollUpButton class="flex h-9 items-center justify-center text-muted">
            <ChevronUp :size="17" aria-hidden="true" />
          </SelectScrollUpButton>
          <SelectViewport class="max-h-72">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
              class="relative flex min-h-11 cursor-pointer select-none items-center rounded-control py-2 pr-10 pl-3 text-sm text-ink outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-warning-soft data-[state=checked]:font-semibold"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator class="absolute right-3 grid size-6 place-items-center text-warning">
                <Check :size="17" stroke-width="2.5" aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
          <SelectScrollDownButton class="flex h-9 items-center justify-center text-muted">
            <ChevronDown :size="17" aria-hidden="true" />
          </SelectScrollDownButton>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
    <p v-if="help" :id="helpId" class="mt-1.5 text-xs font-normal text-muted">{{ help }}</p>
    <p v-if="error" :id="errorId" class="mt-1.5 text-xs font-medium text-danger">{{ error }}</p>
  </div>
</template>
