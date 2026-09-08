<script setup lang="ts">
interface Props { padded?: boolean }
withDefaults(defineProps<Props>(), { padded: true })
</script>

<template>
  <section class="rounded-panel border border-divider bg-canvas shadow-panel" :class="padded ? 'p-5 sm:p-6' : ''">
    <slot />
  </section>
</template>
