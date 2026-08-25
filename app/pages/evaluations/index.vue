<script setup lang="ts">
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('evaluations')
</script>
<template><WorkflowListPage :definition="definition" /></template>

