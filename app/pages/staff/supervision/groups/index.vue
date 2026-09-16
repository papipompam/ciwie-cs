<script setup lang="ts">
// Route นี้ทำหน้าที่เป็นทางเข้าของ /staff/supervision/groups
// ส่วน UI และการทำงานหลักแยกไว้ใน prototype.vue เพื่อให้ไฟล์ route อ่านง่าย
import PrototypeGroupsPage from './prototype.vue'

definePageMeta({ title: 'จัดกลุ่มอาจารย์นิเทศ', middleware: 'staff-prototype' })
useHead({ title: 'จัดกลุ่มอาจารย์นิเทศ' })
</script>

<template>
  <PrototypeGroupsPage />
</template>
