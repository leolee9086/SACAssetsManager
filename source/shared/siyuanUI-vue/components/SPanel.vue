<template>
  <div class="b3-label" :class="panelClass">
    <div v-if="title" class="panel-title">{{ title }}</div>
    <div :class="contentClass">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="fn__flex-1">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  contentClass: {
    type: String,
    default: 'config-query'
  },
  panelClass: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 