<script setup lang="ts">
definePageMeta({ roles: ['STUDENT', 'LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('documents')
</script>
<template><WorkflowListPage :definition="definition" /></template>

