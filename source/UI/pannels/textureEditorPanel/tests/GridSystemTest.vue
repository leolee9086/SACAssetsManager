<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">网格系统测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
        :showGrid="true"
        :gridColor="gridColor"
      />
    </div>
    <div class="canvas-controls">
      <button @click="toggleGrid">{{ showGrid ? '隐藏网格' : '显示网格' }}</button>
      <button @click="changeGridSize(25)">小网格</button>
      <button @click="changeGridSize(50)">中网格</button>
      <button @click="changeGridSize(100)">大网格</button>
      <button @click="changeGridColor">更改网格颜色</button>
      <button @click="resetView">重置视图</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const showGrid = ref(true);
const gridColor = ref('rgba(0, 0, 0, 0.1)');
const gridColors = ['rgba(0, 0, 0, 0.1)', 'rgba(255, 0, 0, 0.1)', 'rgba(0, 0, 255, 0.1)', 'rgba(0, 255, 0, 0.1)'];
let colorIndex = 0;

const toggleGrid = () => {
  if (!canvas.value) return;
  showGrid.value = !showGrid.value;
  canvas.value.toggleGrid(showGrid.value);
};

const changeGridSize = (size) => {
  if (!canvas.value) return;
  canvas.value.setGridSize(size);
};

const changeGridColor = () => {
  if (!canvas.value) return;
  colorIndex = (colorIndex + 1) % gridColors.length;
  gridColor.value = gridColors[colorIndex];
  canvas.value.setGridColor(gridColor.value);
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