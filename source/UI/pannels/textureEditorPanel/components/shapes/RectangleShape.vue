<template>
  <v-rect
    :config="{
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 60,
      fill: element.fill || '#2196F3',
      stroke: element.stroke || 'black',
      strokeWidth: (element.strokeWidth || 1) / scale,
      cornerRadius: element.cornerRadius || 0,
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
</script> 