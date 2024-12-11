<template>
  <div
   class="cc-layout-root" :class="classes" :style="styles">
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 是否全屏模式
  fullscreen: {
    type: Boolean,
    default: true
  },
  // 内边距，支持数字（px）或字符串（如 '16px' 或 'var(--cc-space-md)'）
  padding: {
    type: [String, Number],
    default: 0
  },
  // 背景色变体
  background: {
    type: String,
    default: 'default', // default, primary, secondary
    validator: (value) => ['default', 'primary', 'secondary'].includes(value)
  },
  // 是否启用滚动
  scroll: {
    type: Boolean,
    default: false
  }
});

const classes = computed(() => ({
  'cc-layout-root--fullscreen': props.fullscreen,
  'cc-layout-root--scroll': props.scroll,
  [`cc-layout-root--bg-${props.background}`]: true
}));

const styles = computed(() => ({
  padding: typeof props.padding === 'number' ? `${props.padding}px` : props.padding,
  width: '100%',
  minWidth: '100%'
}));
</script>

<style>
.cc-layout-root {
  display: flex;
  flex-direction: row;
  width: 100%;
  min-width: 100%;
  height: 100%;
  position: relative;
  box-sizing: border-box;
  flex: 1 1 auto;
  margin: 0;
  padding: 0;
}

/* 全屏模式 */
.cc-layout-root--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
}

/* 滚动模式 */
.cc-layout-root--scroll {
  overflow-y: auto;
}

/* 背景色变体 */
.cc-layout-root--bg-default {
  background-color: var(--cc-theme-background, #ffffff);
}

.cc-layout-root--bg-primary {
  background-color: var(--cc-theme-background-primary, #f5f5f5);
}

.cc-layout-root--bg-secondary {
  background-color: var(--cc-theme-background-secondary, #fafafa);
}
</style>
