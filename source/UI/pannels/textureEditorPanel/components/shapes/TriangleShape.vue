<template>
  <v-line
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      points: calculateTrianglePoints(element.size || 50, element.orientation || 'up'),
      fill: element.fill || '#CDDC39',
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

// 计算三角形的顶点
function calculateTrianglePoints(size, orientation) {
  const halfSize = size / 2;
  const height = size * (Math.sqrt(3) / 2);
  const halfHeight = height / 2;
  
  let points = [];
  
  switch (orientation) {
    case 'up':
      points = [0, -halfHeight, halfSize, halfHeight, -halfSize, halfHeight];
      break;
    case 'down':
      points = [0, halfHeight, halfSize, -halfHeight, -halfSize, -halfHeight];
      break;
    case 'left':
      points = [-halfHeight, 0, halfHeight, halfSize, halfHeight, -halfSize];
      break;
    case 'right':
      points = [halfHeight, 0, -halfHeight, halfSize, -halfHeight, -halfSize];
      break;
    default:
      points = [0, -halfHeight, halfSize, halfHeight, -halfSize, halfHeight];
  }
  
  return points;
}
</script> 