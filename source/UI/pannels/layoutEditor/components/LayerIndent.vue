<template>
  <div class="layer-indent" :style="{ width: `${depth * 20}px` }"></div>
</template>

<script setup>
defineProps({
  depth: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.layer-indent {
  flex-shrink: 0;
}
</style> 