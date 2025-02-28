<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">导出功能测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
      />
    </div>
    <div class="canvas-controls">
      <button @click="addRandomElements">添加随机元素</button>
      <button @click="exportAsImage">导出为图片</button>
      <button @click="exportAsJSON">导出为JSON</button>
      <button @click="importFromJSON">从JSON导入</button>
      <button @click="clearCanvas">清空画布</button>
    </div>
    <div v-if="exportedImageUrl" class="export-preview">
      <h3>导出预览</h3>
      <img :src="exportedImageUrl" alt="导出预览" class="preview-image" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const exportedImageUrl = ref('');
let exportedJSON = null;

const addRandomElements = () => {
  if (!canvas.value) return;
  for (let i = 0; i < 5; i++) {
    const type = ['rectangle', 'circle', 'triangle'][Math.floor(Math.random() * 3)];
    const element = {
      type,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
      color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
    };
    
    if (type === 'rectangle') {
      element.width = 80 + Math.random() * 40;
      element.height = 60 + Math.random() * 30;
    } else if (type === 'circle') {
      element.radius = 30 + Math.random() * 20;
    } else {
      element.size = 60 + Math.random() * 30;
    }
    
    canvas.value.addElement(element);
  }
};

const exportAsImage = () => {
  if (!canvas.value) return;
  canvas.value.exportAsImage().then(url => {
    exportedImageUrl.value = url;
  });
};

const exportAsJSON = () => {
  if (!canvas.value) return;
  exportedJSON = canvas.value.exportAsJSON();
  alert('已导出为JSON，可以使用"从JSON导入"按钮恢复');
};

const importFromJSON = () => {
  if (!canvas.value || !exportedJSON) {
    alert('没有可导入的JSON数据');
    return;
  }
  canvas.value.importFromJSON(exportedJSON);
};

const clearCanvas = () => {
  if (!canvas.value) return;
  canvas.value.clearElements();
  exportedImageUrl.value = '';
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

.export-preview {
  padding: 15px;
  border-top: 1px solid #ddd;
  background: #f9f9f9;
}

.export-preview h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
}

.preview-image {
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style> 