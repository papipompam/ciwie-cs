<script setup lang="ts">
definePageMeta({ title: 'แจ้งข้อมูลที่ฝึกงาน', middleware: 'student-prototype' })
await navigateTo('/student/applications', { redirectCode: 301, replace: true })
</script>
