<script setup lang="ts">
definePageMeta({ roles: ['ADMIN'] })
const definition = useWorkflowDefinition('expenses')
</script>
<template><WorkflowListPage :definition="definition" /></template>

