<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">LOD与平移测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
        :minScale="0.1"
        :maxScale="10"
        @viewport-changed="handleViewportChanged"
      />
    </div>
    <div class="canvas-controls">
      <button @click="zoomIn">放大</button>
      <button @click="zoomOut">缩小</button>
      <button @click="panLeft">向左平移</button>
      <button @click="panRight">向右平移</button>
      <button @click="panUp">向上平移</button>
      <button @click="panDown">向下平移</button>
      <button @click="resetView">重置视图</button>
    </div>
    <div class="canvas-info">
      <div>当前缩放: {{ currentScale.toFixed(2) }}x</div>
      <div>坐标: ({{ currentX.toFixed(0) }}, {{ currentY.toFixed(0) }})</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const currentScale = ref(1);
const currentX = ref(0);
const currentY = ref(0);

// 使用Vue的事件系统而不是DOM事件
const handleViewportChanged = (e) => {
  currentScale.value = e.scale;
  currentX.value = e.x;
  currentY.value = e.y;
};

const zoomIn = () => {
  if (!canvas.value) return;
  canvas.value.zoomIn();
};

const zoomOut = () => {
  if (!canvas.value) return;
  canvas.value.zoomOut();
};

const panLeft = () => {
  if (!canvas.value) return;
  canvas.value.panBy(-50, 0);
};

const panRight = () => {
  if (!canvas.value) return;
  canvas.value.panBy(50, 0);
};

const panUp = () => {
  if (!canvas.value) return;
  canvas.value.panBy(0, -50);
};

const panDown = () => {
  if (!canvas.value) return;
  canvas.value.panBy(0, 50);
};

const resetView = () => {
  if (!canvas.value) return;
  canvas.value.resetView();
};
</script>

<style scoped>
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.canvas-title {
  padding: 10px 15px;
  margin: 0;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 16px;
  font-weight: bold;
}

.canvas-box {
  flex: 1;
  position: relative;
  min-height: 300px;
  overflow: hidden;
}

.canvas-controls {
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #ddd;
  background: #f5f5f5;
}

.canvas-controls button {
  padding: 6px 12px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.canvas-controls button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.canvas-controls button:not(:disabled):hover {
  background: #3367d6;
}

.canvas-info {
  padding: 10px 15px;
  border-top: 1px solid #ddd;
  background: #f9f9f9;
  font-size: 14px;
  color: #555;
}
</style> 