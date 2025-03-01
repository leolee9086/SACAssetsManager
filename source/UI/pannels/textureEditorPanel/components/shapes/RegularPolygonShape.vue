<template>
  <v-line
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      points: calculateRegularPolygonPoints(element.sides || 5, element.radius || 50),
      fill: element.fill || '#4CAF50',
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

// 计算正多边形的顶点
function calculateRegularPolygonPoints(sides, radius) {
  const points = [];
  const angleStep = (Math.PI * 2) / sides;
  
  // 从顶部开始绘制（y轴负方向）
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep - Math.PI / 2; // 从顶部开始
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    
    points.push(x, y);
  }
  
  return points;
}
</script> 