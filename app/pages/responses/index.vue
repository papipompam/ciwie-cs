<script setup lang="ts">
definePageMeta({ roles: ['STUDENT', 'LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('responses')
</script>
<template><WorkflowListPage :definition="definition" /></template>

