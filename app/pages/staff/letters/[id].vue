<script setup lang="ts">
definePageMeta({ middleware: 'staff-prototype' })
const route = useRoute()
await navigateTo({ path: '/staff/requests', query: { request: String(route.params.id) } }, { redirectCode: 301, replace: true })
</script>
