<template>
  <v-path
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      data: generateCrescentPath(element.radius || 40, element.thickness || 20),
      fill: element.fill || '#FFC107',
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

// 生成月牙形SVG路径
function generateCrescentPath(radius, thickness) {
  const innerRadius = radius - thickness;
  
  // 外圆弧
  const outerArc = `M0,${-radius} A${radius},${radius} 0 1,1 0,${radius}`;
  // 内圆弧（逆向）
  const innerArc = `A${innerRadius},${innerRadius} 0 1,0 0,${-radius}`;
  
  return `${outerArc} ${innerArc} Z`;
}
</script> 