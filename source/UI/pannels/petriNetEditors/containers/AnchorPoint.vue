<template>
    <div :class="['anchor-point', `anchor-${anchor.type}`]" :style="anchorStyle" :title="anchor.label">
      <div class="anchor-dot"></div>
      <span class="anchor-label">{{ anchor.label }}</span>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  
  const props = defineProps({
    anchor: Object,
    side: String
  });
  
  const anchorStyle = computed(() => ({
    '--anchor-position': `${props.anchor.position * 100}%`
  }));
  </script>
  
  <style scoped>
  /* 锚点样式 */
  .anchor-point {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .anchor-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #94a3b8;
    border: 2px solid white;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }
  .anchor-label {
    font-size: 12px;
    color: #475569;
    font-weight: 500;
    opacity: 0;
    transition: all 0.2s ease;
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  }
  </style>