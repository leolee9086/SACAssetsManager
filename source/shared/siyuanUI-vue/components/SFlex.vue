<template>
  <div 
    class="fn__flex" 
    :class="{
      'fn__flex-1': flex1,
      'fn__flex-center': center,
      'b3-label': isLabel,
      'config__item': isConfigItem,
      'fn__flex-column': column,
      'fn__flex-1': fill
    }"
    :style="style"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  flex1: {
    type: Boolean,
    default: false
  },
  center: {
    type: Boolean,
    default: false
  },
  isLabel: {
    type: Boolean,
    default: false
  },
  isConfigItem: {
    type: Boolean,
    default: false
  },
  column: {
    type: Boolean,
    default: false
  },
  fill: {
    type: Boolean,
    default: false
  },
  gap: {
    type: [Number, String],
    default: null
  }
});

const style = computed(() => {
  if (props.gap !== null) {
    return { gap: typeof props.gap === 'number' ? `${props.gap}px` : props.gap };
  }
  return {};
});
</script>

<style scoped>
/* 基础样式会从思源的CSS中继承 */
.fn__flex {
  display: flex;
}

.fn__flex-column {
  flex-direction: column;
}
</style> 