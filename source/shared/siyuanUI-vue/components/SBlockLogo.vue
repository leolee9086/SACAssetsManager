<template>
  <div class="block__logo">
    <svg class="block__logoicon"><use :xlink:href="iconHref"></use></svg>
    <slot>{{ text }}</slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  text: {
    type: String,
    default: ''
  }
});

const iconHref = computed(() => {
  return `#icon${props.icon}`;
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
.block__logo {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 8px;
}

.block__logoicon {
  margin-right: 4px;
}
</style> 