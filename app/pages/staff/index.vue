<script setup lang="ts">
definePageMeta({ title: 'ข้อมูลนักศึกษา', middleware: 'staff-prototype' })

await navigateTo('/staff/students', { replace: true })
</script>
