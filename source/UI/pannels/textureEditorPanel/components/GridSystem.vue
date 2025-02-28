<template>
  <v-group ref="gridGroup">
    <!-- 网格线由代码动态生成 -->
  </v-group>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { drawGridWithThrottle } from '../utils/gridUtils/index.js';

// 定义props
const props = defineProps({
  // 视口边界
  viewport: {
    type: Object,
    required: true
  },
  // 当前缩放比例
  scale: {
    type: Number,
    required: true
  },
  // 网格大小（单位）
  gridSize: {
    type: Number,
    default: 50
  },
  // 单位比例
  unitRatio: {
    type: Number,
    default: 1
  },
  // 主题设置
  theme: {
    type: Object,
    default: () => ({
      primaryColor: 'rgba(200, 200, 200, 0.2)',
      secondaryColor: 'rgba(200, 200, 200, 0.1)',
      tertiaryColor: 'rgba(200, 200, 200, 0.05)',
      axisXColor: 'rgba(255, 0, 0, 0.5)',
      axisYColor: 'rgba(0, 128, 0, 0.5)',
      lineWidth: 1
    })
  },
  // 节流延迟
  throttleDelay: {
    type: Number,
    default: 60
  },
  // 是否显示网格
  visible: {
    type: Boolean,
    default: true
  }
});

// DOM引用
const gridGroup = ref(null);

// 定义绘制网格的函数
const drawGrid = () => {
  if (!gridGroup.value || !gridGroup.value.getNode() || !props.visible) return;

  // 获取当前视口边界并添加额外信息
  const bounds = { 
    ...props.viewport,
    width: props.viewport.right - props.viewport.left,
    height: props.viewport.bottom - props.viewport.top
  };

  // 调用工具函数绘制网格
  drawGridWithThrottle(
    gridGroup.value.getNode(),  // Konva网格组
    bounds,                     // 视口边界
    props.scale,                // 当前缩放比例
    props.gridSize,             // 网格大小配置
    props.unitRatio,            // 单位比例
    window.Konva,               // Konva对象(用于创建元素)
    {
      // 配置项
      throttleDelay: props.throttleDelay,
      theme: props.theme
    }
  );
};

// 监听属性变化，更新网格
watch(() => [props.viewport, props.scale, props.gridSize, props.unitRatio, props.visible], 
  () => {
    drawGrid();
  }, 
  { deep: true }
);

// 组件挂载时初始化网格
onMounted(() => {
  drawGrid();
});

// 向父组件暴露方法
defineExpose({
  redraw: drawGrid,
  gridGroup
});
</script> 