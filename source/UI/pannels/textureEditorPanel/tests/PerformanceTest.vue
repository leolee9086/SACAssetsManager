<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">性能测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
      />
    </div>
    <div class="canvas-controls">
      <button @click="addElements(100)">添加100个元素</button>
      <button @click="addElements(500)">添加500个元素</button>
      <button @click="addElements(1000)">添加1000个元素</button>
      <button @click="clearCanvas">清空画布</button>
      <button @click="startPerformanceTest" :disabled="isTestRunning">运行性能测试</button>
    </div>
    <div class="performance-info">
      <div>当前元素数量: {{ elementCount }}</div>
      <div>平均帧率: {{ fps.toFixed(1) }} FPS</div>
      <div>渲染时间: {{ renderTime.toFixed(2) }} ms</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const elementCount = ref(0);
const fps = ref(0);
const renderTime = ref(0);
const isTestRunning = ref(false);

let fpsInterval;
let lastTime = 0;
let frameCount = 0;
let totalRenderTime = 0;

onMounted(() => {
  resetPerformanceMetrics();
});

onUnmounted(() => {
  if (fpsInterval) {
    clearInterval(fpsInterval);
  }
});

const resetPerformanceMetrics = () => {
  fps.value = 0;
  renderTime.value = 0;
  frameCount = 0;
  totalRenderTime = 0;
  lastTime = performance.now();
};

const addElements = (count) => {
  if (!canvas.value) return;
  
  const startTime = performance.now();
  
  for (let i = 0; i < count; i++) {
    const type = ['rectangle', 'circle', 'triangle'][Math.floor(Math.random() * 3)];
    const element = {
      type,
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
    };
    
    if (type === 'rectangle') {
      element.width = 20 + Math.random() * 30;
      element.height = 20 + Math.random() * 30;
    } else if (type === 'circle') {
      element.radius = 10 + Math.random() * 20;
    } else {
      element.size = 20 + Math.random() * 30;
    }
    
    canvas.value.addElement(element);
  }
  
  elementCount.value += count;
  
  const endTime = performance.now();
  console.log(`添加 ${count} 个元素耗时: ${(endTime - startTime).toFixed(2)} ms`);
};

const clearCanvas = () => {
  if (!canvas.value) return;
  canvas.value.clearElements();
  elementCount.value = 0;
  resetPerformanceMetrics();
};

const startPerformanceTest = () => {
  if (!canvas.value || isTestRunning.value) return;
  
  isTestRunning.value = true;
  resetPerformanceMetrics();
  
  // 添加性能监测
  if (canvas.value.enablePerformanceMonitoring) {
    canvas.value.enablePerformanceMonitoring(true);
  }
  
  // 监测FPS
  fpsInterval = setInterval(() => {
    const currentTime = performance.now();
    const elapsedTime = currentTime - lastTime;
    
    if (elapsedTime > 0) {
      fps.value = frameCount * 1000 / elapsedTime;
      renderTime.value = totalRenderTime / (frameCount || 1);
    }
    
    lastTime = currentTime;
    frameCount = 0;
    totalRenderTime = 0;
  }, 1000);
  
  // 添加帧更新回调
  if (canvas.value.onFrameRendered) {
    canvas.value.onFrameRendered((frameTime) => {
      frameCount++;
      totalRenderTime += frameTime;
    });
  }
  
  // 自动漫游
  let zoomDirection = 1;
  let panXDirection = 1;
  let panYDirection = 1;
  
  const autoNavigate = () => {
    if (!canvas.value || !isTestRunning.value) return;
    
    // 随机缩放
    if (Math.random() < 0.05) {
      zoomDirection *= -1;
    }
    
    if (zoomDirection > 0) {
      canvas.value.zoomIn(0.01);
    } else {
      canvas.value.zoomOut(0.01);
    }
    
    // 随机平移
    if (Math.random() < 0.05) {
      panXDirection *= -1;
    }
    if (Math.random() < 0.05) {
      panYDirection *= -1;
    }
    
    canvas.value.panBy(panXDirection * 5, panYDirection * 5);
    
    requestAnimationFrame(autoNavigate);
  };
  
  autoNavigate();
  
  // 10秒后停止测试
  setTimeout(() => {
    isTestRunning.value = false;
    if (fpsInterval) {
      clearInterval(fpsInterval);
    }
    if (canvas.value.enablePerformanceMonitoring) {
      canvas.value.enablePerformanceMonitoring(false);
    }
  }, 10000);
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

.performance-info {
  padding: 10px 15px;
  border-top: 1px solid #ddd;
  background: #f9f9f9;
  font-size: 14px;
  color: #555;
}
</style> 