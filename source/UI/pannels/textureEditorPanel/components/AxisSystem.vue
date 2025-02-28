<template>
  <v-group>
    <!-- X轴 -->
    <v-line :config="xAxisConfig"></v-line>
    <!-- Y轴 -->
    <v-line :config="yAxisConfig"></v-line>
  </v-group>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 视口边界
  viewport: {
    type: Object,
    required: true
  },
  // 坐标轴样式
  xAxisColor: {
    type: String,
    default: 'red'
  },
  yAxisColor: {
    type: String,
    default: 'green'
  },
  // 线宽
  strokeWidth: {
    type: Number,
    default: 1
  },
  // 当前缩放比例
  scale: {
    type: Number,
    default: 1
  },
  // 是否显示
  visible: {
    type: Boolean,
    default: true
  }
});

// X轴配置
const xAxisConfig = computed(() => {
  return {
    points: [props.viewport.left, 0, props.viewport.right, 0], // 动态计算水平线长度
    stroke: props.xAxisColor,
    strokeWidth: props.strokeWidth / props.scale,
    visible: props.visible
  };
});

// Y轴配置
const yAxisConfig = computed(() => {
  return {
    points: [0, props.viewport.top, 0, props.viewport.bottom], // 动态计算垂直线长度
    stroke: props.yAxisColor,
    strokeWidth: props.strokeWidth / props.scale,
    visible: props.visible
  };
});
</script> 