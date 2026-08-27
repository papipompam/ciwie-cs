<script setup lang="ts">
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('organizations')
</script>
<template><WorkflowListPage :definition="definition" /></template>
