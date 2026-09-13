<script setup lang="ts">
definePageMeta({ title: 'แก้ไขข้อมูลส่วนตัว' })
useHead({ title: 'แก้ไขข้อมูลส่วนตัว' })

const open = ref(true)
const handleOpenChange = async (value: boolean) => {
  open.value = value
  if (!value) await navigateTo('/')
}
</script>

<template>
  <StudentProfileDialog :open="open" @update:open="handleOpenChange" />
</template>
