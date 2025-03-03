<template>
  <div class="b3-label config__item">
    <slot name="title">{{ title }}</slot>
    <div v-if="text" class="b3-label__text">
      <slot name="text">{{ text }}</slot>
    </div>
    <span v-if="hasDivider" class="fn__hr"></span>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: ''
  },
  hasDivider: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
/* 样式会从思源的CSS中继承 */
</style> 