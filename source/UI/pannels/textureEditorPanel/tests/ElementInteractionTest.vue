<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">元素交互测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
        :interactive="true"
      />
    </div>
    <div class="canvas-controls">
      <button @click="addRectangle">添加矩形</button>
      <button @click="addCircle">添加圆形</button>
      <button @click="addTriangle">添加三角形</button>
      <button @click="deleteSelected">删除选中</button>
      <button @click="clearCanvas">清空画布</button>
      <button @click="toggleInteraction">{{ interactive ? '禁用交互' : '启用交互' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const interactive = ref(true);

const addRectangle = () => {
  if (!canvas.value) return;
  canvas.value.addElement({
    type: 'rectangle',
    x: Math.random() * 400 - 200,
    y: Math.random() * 400 - 200,
    width: 80 + Math.random() * 40,
    height: 60 + Math.random() * 30,
    color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
  });
};

const addCircle = () => {
  if (!canvas.value) return;
  canvas.value.addElement({
    type: 'circle',
    x: Math.random() * 400 - 200,
    y: Math.random() * 400 - 200,
    radius: 30 + Math.random() * 20,
    color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
  });
};

const addTriangle = () => {
  if (!canvas.value) return;
  canvas.value.addElement({
    type: 'triangle',
    x: Math.random() * 400 - 200,
    y: Math.random() * 400 - 200,
    size: 60 + Math.random() * 30,
    color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
  });
};

const deleteSelected = () => {
  if (!canvas.value) return;
  canvas.value.deleteSelectedElements();
};

const clearCanvas = () => {
  if (!canvas.value) return;
  canvas.value.clearElements();
};

const toggleInteraction = () => {
  if (!canvas.value) return;
  interactive.value = !interactive.value;
  canvas.value.setInteractive(interactive.value);
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