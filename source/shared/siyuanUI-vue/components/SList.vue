<template>
  <ul class="b3-list" :class="{'b3-list--background': background}">
    <slot></slot>
    <li v-if="isEmpty" class="b3-list--empty">
      {{ emptyText }}
    </li>
  </ul>
</template>

<script setup>
const props = defineProps({
  background: {
    type: Boolean,
    default: false
  },
  isEmpty: {
    type: Boolean,
    default: false
  },
  emptyText: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
</style> 