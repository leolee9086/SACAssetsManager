<template>
  <v-line
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      points: calculateDiamondPoints(element.width || 50, element.height || 80),
      fill: element.fill || '#3F51B5',
      stroke: element.stroke || 'black',
      strokeWidth: (element.strokeWidth || 1) / scale,
      closed: true,
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

// 计算菱形的四个顶点
function calculateDiamondPoints(width, height) {
  // 计算中心位置
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // 计算四个顶点位置
  return [
    0, -halfHeight,   // 上顶点
    halfWidth, 0,     // 右顶点
    0, halfHeight,    // 下顶点
    -halfWidth, 0     // 左顶点
  ];
}
</script> 