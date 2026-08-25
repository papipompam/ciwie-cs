<script setup lang="ts">
definePageMeta({ roles: ['ADMIN'] })
const definition = useWorkflowDefinition('audit')
</script>
<template><WorkflowListPage :definition="definition" /></template>

