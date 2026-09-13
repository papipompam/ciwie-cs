<script setup lang="ts">
import PrototypeGroupsPage from './prototype.vue'

definePageMeta({ title: 'จัดกลุ่มอาจารย์นิเทศ', middleware: 'staff-prototype' })
useHead({ title: 'จัดกลุ่มอาจารย์นิเทศ' })
</script>

<template>
  <PrototypeGroupsPage />
</template>
