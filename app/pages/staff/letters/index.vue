<script setup lang="ts">
definePageMeta({ middleware: 'staff-prototype' })
await navigateTo('/staff/requests', { redirectCode: 301, replace: true })
</script>
