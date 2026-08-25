<script setup lang="ts">
definePageMeta({ roles: ['STUDENT', 'LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('applications')
</script>
<template><WorkflowListPage :definition="definition" /></template>

