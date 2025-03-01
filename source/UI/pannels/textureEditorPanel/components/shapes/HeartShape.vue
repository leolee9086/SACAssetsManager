<template>
  <v-path
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      data: generateHeartPath(element.size || 50),
      fill: element.fill || '#FF5252',
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

// 生成心形SVG路径
function generateHeartPath(size) {
  const width = size;
  const height = size;
  // 标准化为100宽度和高度
  return `
    M ${width/2},${height/5}
    C ${width/5},${0} ${0},${height/2.5} ${width/2},${height}
    C ${width},${height/2.5} ${width*4/5},${0} ${width/2},${height/5}
    Z
  `;
}
</script> 