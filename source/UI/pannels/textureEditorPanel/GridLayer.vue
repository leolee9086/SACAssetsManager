<template>
  <v-layer ref="gridLayer">
    <!-- 绘制UV坐标网格 -->
    <template v-for="line in gridLines" :key="line.id">
      <v-line
        :config="{
          points: line.points,
          stroke: 'rgba(0,0,0,0.1)',
          strokeWidth: 1
        }"
      />
    </template>
    
    <!-- UV坐标标记 -->
    <template v-for="label in gridLabels" :key="label.id">
      <v-text
        :config="{
          x: label.x,
          y: label.y,
          text: label.text,
          fontSize: 12,
          fontFamily: 'Arial',
          fill: 'rgba(0,0,0,0.6)',
          align: 'center',
          verticalAlign: 'middle'
        }"
      />
    </template>
    
    <!-- 绘制X轴参考线 -->
    <v-line
      :config="{
        points: [-stageWidth, 0, stageWidth, 0],
        stroke: 'rgba(0,0,0,0.3)',
        strokeWidth: 1.5
      }"
    />
    
    <!-- 绘制Y轴参考线 -->
    <v-line
      :config="{
        points: [0, -stageHeight, 0, stageHeight],
        stroke: 'rgba(0,0,0,0.3)',
        strokeWidth: 1.5
      }"
    />
  </v-layer>
</template>

<script setup>
import { ref, computed, defineExpose } from 'vue';

const props = defineProps({
  stageWidth: {
    type: Number,
    default: 500
  },
  stageHeight: {
    type: Number,
    default: 500
  },
  gridSpacing: {
    type: Number,
    default: 50
  },
  gridExtent: {
    type: Number,
    default: 2
  },
  gridPrecision: {
    type: Number,
    default: 0.1
  }
});

const gridLayer = ref(null);

// 计算网格线
const gridLines = computed(() => {
  const lines = [];
  const spacing = props.gridSpacing;
  const extent = props.gridExtent;
  const precision = props.gridPrecision;
  
  // 使用画布尺寸确保网格线填满整个画布
  const width = props.stageWidth;
  const height = props.stageHeight;
  const maxDimension = Math.max(width, height) * 2; // 确保足够长
  
  // 水平线 (U轴平行线)
  for (let i = -extent; i <= extent; i += precision) {
    if (Math.abs(i) < 0.001) continue; // 跳过原点线，因为我们已经有X轴了
    lines.push({
      id: `h-${i}`,
      points: [-maxDimension/2, i * spacing / precision, maxDimension/2, i * spacing / precision]
    });
  }
  
  // 垂直线 (V轴平行线)
  for (let i = -extent; i <= extent; i += precision) {
    if (Math.abs(i) < 0.001) continue; // 跳过原点线，因为我们已经有Y轴了
    lines.push({
      id: `v-${i}`,
      points: [i * spacing / precision, -maxDimension/2, i * spacing / precision, maxDimension/2]
    });
  }
  
  return lines;
});

// 计算网格标签
const gridLabels = computed(() => {
  const labels = [];
  const spacing = props.gridSpacing;
  const extent = props.gridExtent;
  const precision = props.gridPrecision;
  
  // U轴标签 (X轴)
  for (let i = -extent; i <= extent; i += precision) {
    if (Math.abs(i) < 0.001) continue; // 跳过原点
    labels.push({
      id: `u-${i}`,
      x: i * spacing / precision,
      y: 15, // 稍微偏离轴线
      text: i.toFixed(1) // 只显示数值
    });
  }
  
  // V轴标签 (Y轴)
  for (let i = -extent; i <= extent; i += precision) {
    if (Math.abs(i) < 0.001) continue; // 跳过原点
    labels.push({
      id: `v-${i}`,
      x: -15, // 稍微偏离轴线，放在左侧
      y: i * spacing / precision,
      text: i.toFixed(1) // 只显示数值
    });
  }
  
  // 原点标签
  labels.push({
    id: 'origin',
    x: -15,
    y: 15,
    text: '0.0'
  });
  
  // 在画布边缘添加坐标轴符号标记
  labels.push({
    id: 'u-axis-label',
    x: props.stageWidth / 2 - 30,
    y: 15,
    text: 'U'
  });
  
  labels.push({
    id: 'v-axis-label',
    x: -15,
    y: -props.stageHeight / 2 + 30,
    text: 'V'
  });
  
  return labels;
});

// 将坐标系原点设为画布中心
const centerCoordinateSystem = () => {
  if (gridLayer.value && gridLayer.value.getNode()) {
    const gridLayerNode = gridLayer.value.getNode();
    gridLayerNode.x(props.stageWidth / 2);
    gridLayerNode.y(props.stageHeight / 2);
  }
};

defineExpose({
  centerCoordinateSystem,
  gridLayer
});
</script>
