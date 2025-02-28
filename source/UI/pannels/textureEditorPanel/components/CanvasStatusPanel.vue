<template>
  <div class="canvas-status-panel" :class="positionClass">
    <div class="status-item">
      <span>坐标范围:</span>
      <span>X: {{ viewportBounds.left.toFixed(2) }} 至 {{ viewportBounds.right.toFixed(2) }}</span>
      <span>Y: {{ viewportBounds.top.toFixed(2) }} 至 {{ viewportBounds.bottom.toFixed(2) }}</span>
    </div>
    <div class="status-item">
      <span>缩放比例:</span>
      <span>{{ displayScale }}</span>
    </div>
    <div class="status-item">
      <span>LOD级别:</span>
      <span>{{ lodLevel }}</span>
    </div>
    <div class="status-item" v-if="constrainPan">
      <span>距原点:</span>
      <span>{{ distanceFromOrigin.toFixed(2) }} / {{ maxPanDistance === Infinity ? '无限制' : maxPanDistance }}</span>
    </div>
    <!-- FPS显示 -->
    <div class="status-item" v-if="showFps">
      <span>FPS:</span>
      <span>{{ fps }}</span>
    </div>
    <!-- 添加插槽支持自定义状态项 -->
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 视口边界
  viewportBounds: {
    type: Object,
    required: true
  },
  // 当前缩放比例
  scale: {
    type: Number,
    required: true
  },
  // LOD级别
  lodLevel: {
    type: Number,
    default: 0
  },
  // 是否约束平移
  constrainPan: {
    type: Boolean,
    default: false
  },
  // 距离原点的距离
  distanceFromOrigin: {
    type: Number,
    default: 0
  },
  // 最大平移距离
  maxPanDistance: {
    type: Number,
    default: Infinity
  },
  // FPS相关
  fps: {
    type: Number,
    default: 0
  },
  showFps: {
    type: Boolean,
    default: true
  },
  // 位置配置
  position: {
    type: String,
    default: 'top-left',  // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  }
});

// 格式化缩放比例显示
const displayScale = computed(() => {
  // 如果比例过小或过大，使用科学计数法
  if (props.scale < 0.01 || props.scale > 100) {
    return props.scale.toExponential(2) + 'x';
  }
  // 否则使用固定小数位显示
  return props.scale.toFixed(2) + 'x';
});

// 根据position属性计算对应的类名
const positionClass = computed(() => {
  return `position-${props.position}`;
});
</script>

<style scoped>
.canvas-status-panel {
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 12px;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

/* 使用类名而不是属性选择器设置位置 */
.position-top-left {
  top: 10px;
  left: 10px;
}

.position-top-right {
  top: 10px;
  right: 10px;
}

.position-bottom-left {
  bottom: 10px;
  left: 10px;
}

.position-bottom-right {
  bottom: 10px;
  right: 10px;
}

.status-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.status-item > span:first-child {
  font-weight: bold;
  margin-bottom: 2px;
}
</style> 