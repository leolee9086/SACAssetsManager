<template>
  <button class="expand-toggle" @click.stop="$emit('toggle')">
    <svg width="16" height="16">
      <use :href="expanded ? '#iconExpand' : '#iconCollapse'" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  expanded: Boolean
})
</script> 