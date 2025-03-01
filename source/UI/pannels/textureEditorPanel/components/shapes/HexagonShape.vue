<template>
  <v-line
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      points: calculateHexagonPoints(element.radius || 50, element.flatTop || false),
      fill: element.fill || '#FF9800',
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

// 计算六边形的顶点
function calculateHexagonPoints(radius, flatTop) {
  const points = [];
  const sides = 6;
  const angleStep = (Math.PI * 2) / sides;
  // 旋转角度：尖顶朝上还是平顶朝上
  const angleOffset = flatTop ? 0 : Math.PI / 6;
  
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep + angleOffset;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    
    points.push(x, y);
  }
  
  return points;
}
</script> 