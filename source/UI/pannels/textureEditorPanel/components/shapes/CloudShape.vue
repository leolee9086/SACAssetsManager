<template>
  <v-path
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      data: generateCloudPath(element.width || 100, element.height || 60, element.bumpCount || 5),
      fill: element.fill || '#FFFFFF',
      stroke: element.stroke || '#AAAAAA',
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

// 生成云朵SVG路径
function generateCloudPath(width, height, bumpCount) {
  let path = 'M0,' + (height * 0.5) + ' ';
  const bumpSize = width / bumpCount;
  
  // 生成上半部分的弧形
  for (let i = 0; i < bumpCount; i++) {
    const x = i * bumpSize;
    const cp1x = x + bumpSize * 0.25;
    const cp1y = height * 0.1;
    const cp2x = x + bumpSize * 0.75;
    const cp2y = height * 0.1;
    const endX = x + bumpSize;
    const endY = height * 0.5;
    
    path += `C ${cp1x},${cp1y} ${cp2x},${cp1y} ${endX},${endY} `;
  }
  
  // 生成下半部分的弧形
  for (let i = bumpCount - 1; i >= 0; i--) {
    const x = i * bumpSize;
    const cp1x = x + bumpSize * 0.75;
    const cp1y = height * 0.9;
    const cp2x = x + bumpSize * 0.25;
    const cp2y = height * 0.9;
    const endX = x;
    const endY = height * 0.5;
    
    path += `C ${cp1x},${cp1y} ${cp2x},${cp1y} ${endX},${endY} `;
  }
  
  path += 'Z';
  return path;
}
</script> 