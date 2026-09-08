<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  icon?: Component
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  icon: undefined,
})

const variantClasses = computed(() => ({
  primary: 'border-primary bg-primary text-ink hover:border-primary-hover hover:bg-primary-hover',
  secondary: 'border-divider bg-canvas text-ink hover:bg-surface',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface',
  danger: 'border-danger bg-danger text-white hover:bg-red-700',
}[props.variant]))

const sizeClasses = computed(() => props.size === 'sm'
  ? 'min-h-9 px-3 text-sm'
  : 'min-h-11 px-4 text-sm')
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-control border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55"
    :class="[variantClasses, sizeClasses]"
  >
    <svg v-if="loading" class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
      <path class="opacity-80" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" />
    </svg>
    <component :is="icon" v-else-if="icon" :size="17" aria-hidden="true" />
    <slot />
  </button>
</template>
