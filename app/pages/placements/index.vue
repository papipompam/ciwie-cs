<script setup lang="ts">
definePageMeta({ roles: ['STUDENT', 'LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('placements')
</script>
<template><WorkflowListPage :definition="definition" /></template>

