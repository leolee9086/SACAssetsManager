<template>
  <label class="fn__flex b3-label">
    <div class="fn__flex-1">
      <slot name="title">{{ title }}</slot>
      <div v-if="text" class="b3-label__text">
        <slot name="text">{{ text }}</slot>
      </div>
    </div>
    <span class="fn__space"></span>
    <slot></slot>
  </label>
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
  }
});
</script>

<style scoped>
/* 样式会从思源的CSS中继承 */
</style> 