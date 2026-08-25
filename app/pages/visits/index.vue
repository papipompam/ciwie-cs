<script setup lang="ts">
definePageMeta({ roles: ['STUDENT', 'LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('visits')
</script>
<template><WorkflowListPage :definition="definition" /></template>

