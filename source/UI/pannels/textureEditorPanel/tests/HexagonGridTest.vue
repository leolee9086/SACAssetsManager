<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">六边形网格测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
        :gridType="gridType"
      />
    </div>
    <div class="canvas-controls">
      <button @click="toggleGridType">切换网格类型</button>
      <button @click="changeHexSize(30)">小六边形</button>
      <button @click="changeHexSize(50)">中六边形</button>
      <button @click="changeHexSize(80)">大六边形</button>
      <button @click="toggleOrientation">切换六边形方向</button>
      <button @click="createHexMap">创建六边形地图</button>
      <button @click="clearCanvas">清空画布</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const gridType = ref('square');  // 'square' 或 'hexagon'
const hexOrientation = ref('flat'); // 'flat' 或 'pointy'

const toggleGridType = () => {
  if (!canvas.value) return;
  gridType.value = gridType.value === 'square' ? 'hexagon' : 'square';
  canvas.value.setGridType(gridType.value);
};

const changeHexSize = (size) => {
  if (!canvas.value) return;
  canvas.value.setGridSize(size);
};

const toggleOrientation = () => {
  if (!canvas.value) return;
  hexOrientation.value = hexOrientation.value === 'flat' ? 'pointy' : 'flat';
  canvas.value.setHexOrientation(hexOrientation.value);
};

const createHexMap = () => {
  if (!canvas.value) return;
  
  // 确保设置为六边形网格
  gridType.value = 'hexagon';
  canvas.value.setGridType('hexagon');
  
  const gridSize = 50;
  const mapWidth = 10;
  const mapHeight = 8;
  
  // 根据六边形的方向计算位置偏移
  const isFlat = hexOrientation.value === 'flat';
  
  for (let q = -Math.floor(mapWidth/2); q <= Math.floor(mapWidth/2); q++) {
    for (let r = -Math.floor(mapHeight/2); r <= Math.floor(mapHeight/2); r++) {
      // 六边形坐标转笛卡尔坐标
      const x = isFlat 
        ? gridSize * (3/2 * q)
        : gridSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
      
      const y = isFlat
        ? gridSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
        : gridSize * (3/2 * r);
      
      // 随机颜色，但要柔和一些
      const h = Math.floor(Math.random() * 360);
      const s = 30 + Math.floor(Math.random() * 20);
      const l = 70 + Math.floor(Math.random() * 20);
      
      canvas.value.addElement({
        type: 'hexagon',
        q, r,
        x, y,
        size: gridSize * 0.9,
        orientation: hexOrientation.value,
        color: `hsl(${h}, ${s}%, ${l}%)`
      });
    }
  }
};

const clearCanvas = () => {
  if (!canvas.value) return;
  canvas.value.clearElements();
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