<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">基本缩放与平移</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
        :showMouseIndicator="true"
      />
    </div>
    <div class="canvas-controls">
      <button @click="testZoomIn">放大</button>
      <button @click="testZoomOut">缩小</button>
      <button @click="resetView">重置视图</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);

const testZoomIn = () => {
  if (!canvas.value) return;
  canvas.value.zoomIn();
};

const testZoomOut = () => {
  if (!canvas.value) return;
  canvas.value.zoomOut();
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
</style> 