<template>
  <v-path
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      data: generateCrossPath(element.size || 50, element.thickness || 12),
      fill: element.fill || '#E53935',
      stroke: element.stroke || 'black',
      strokeWidth: (element.strokeWidth || 1) / scale,
      draggable: element.draggable !== false,
      id: element.id,
      _isCanvasElement: true,
      ...element.config
    }"
    @dragend="$emit('dragend', $event)"
    @click="$emit('click', element)"
  />
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  element: {
    type: Object,
    required: true
  },
  scale: {
    type: Number,
    default: 1
  }
});

defineEmits(['dragend', 'click']);

// 生成十字形SVG路径
function generateCrossPath(size, thickness) {
  const half = size / 2;
  const halfThick = thickness / 2;
  
  return `
    M ${half-halfThick},0
    L ${half+halfThick},0
    L ${half+halfThick},${half-halfThick}
    L ${size},${half-halfThick}
    L ${size},${half+halfThick}
    L ${half+halfThick},${half+halfThick}
    L ${half+halfThick},${size}
    L ${half-halfThick},${size}
    L ${half-halfThick},${half+halfThick}
    L 0,${half+halfThick}
    L 0,${half-halfThick}
    L ${half-halfThick},${half-halfThick}
    Z
  `;
}
</script> 