<template>
  <div class="canvas-test-container">
    <h1 class="test-title">无限画布测试</h1>
    
    <div class="canvas-grid">
      <!-- 画布 1：基本功能测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">基本功能</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas1" 
            :initialScale="1" 
            :gridSize="50"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="testZoomAndPan(1)">测试缩放和平移</button>
          <button @click="testDrawLine(1)">绘制线条</button>
        </div>
      </div>
      
      <!-- 画布 2：网格系统测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">自定义网格</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas2" 
            :initialScale="0.8" 
            :gridSize="100"
            :unitRatio="0.5"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="changeGridSize">更改网格大小</button>
          <button @click="changeUnitRatio">更改单位比例</button>
        </div>
      </div>
      
      <!-- 画布 3：元素添加测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">元素交互</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas3" 
            :initialScale="1.2" 
            v-model="elements"
            @element-added="onElementAdded"
            @element-updated="onElementUpdated"
          />
        </div>
        <div class="canvas-controls">
          <button @click="addRandomElement">添加随机元素</button>
          <button @click="addMultipleElements">添加多个元素</button>
          <button @click="clearElements">清除所有元素</button>
        </div>
      </div>
      
      <!-- 画布 4：导出测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">导出功能</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas4" 
            :initialScale="0.9"
            :initialPosition="{x: 300, y: 200}"
          />
        </div>
        <div class="canvas-controls">
          <button @click="addSampleContent">添加示例内容</button>
          <button @click="exportCanvas">导出为图片</button>
          <button @click="exportSpecificArea">导出指定区域</button>
          <button @click="exportSpecificElements">导出指定元素</button>
          <button @click="addMassiveElements">渲染巨量元素</button>
        </div>
        <div v-if="exportedImage" class="export-preview">
          <img :src="exportedImage" alt="导出预览" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import InfiniteCanvas from './InfiniteCanvas.vue';

// 引用四个画布
const canvas1 = ref(null);
const canvas2 = ref(null);
const canvas3 = ref(null);
const canvas4 = ref(null);

// 为画布3提供元素数组
const elements = ref([]);

// 导出预览图片
const exportedImage = ref(null);

// 1. 测试基本功能
const testZoomAndPan = (canvasId) => {
  const canvas = canvasId === 1 ? canvas1.value : null;
  if (!canvas) return;
  
  // 测试缩放
  canvas.zoomIn();
  
  // 500ms后平移
  setTimeout(() => {
    const stage = canvas.stage.getNode();
    // 模拟平移
    canvas.resetView();
  }, 500);
  
  // 1000ms后再次缩放
  setTimeout(() => {
    canvas.zoomOut();
  }, 1000);
};

const testDrawLine = (canvasId) => {
  const canvas = canvasId === 1 ? canvas1.value : null;
  if (!canvas) return;
  
  // 切换到线条绘制模式
  canvas.toggleDrawMode();
};

// 2. 测试网格系统
const changeGridSize = () => {
  // 在三种网格大小之间循环
  const gridSizes = [50, 100, 200];
  const currentCanvas = canvas2.value;
  
  if (!currentCanvas || !currentCanvas.stage) return;
  
  // 获取当前网格大小的索引
  const currentProps = currentCanvas.stage.getNode().attrs.props;
  const currentSize = currentProps.gridSize;
  const currentIndex = gridSizes.indexOf(currentSize);
  
  // 计算下一个网格大小
  const nextIndex = (currentIndex + 1) % gridSizes.length;
  
  // 更新网格大小
  currentProps.gridSize = gridSizes[nextIndex];
};

const changeUnitRatio = () => {
  // 在三种单位比例之间循环
  const ratios = [0.5, 1, 2];
  const currentCanvas = canvas2.value;
  
  if (!currentCanvas || !currentCanvas.stage) return;
  
  // 获取当前单位比例的索引
  const currentProps = currentCanvas.stage.getNode().attrs.props;
  const currentRatio = currentProps.unitRatio;
  const currentIndex = ratios.indexOf(currentRatio);
  
  // 计算下一个单位比例
  const nextIndex = (currentIndex + 1) % ratios.length;
  
  // 更新单位比例
  currentProps.unitRatio = ratios[nextIndex];
};

// 3. 测试元素操作
const getRandomColor = () => {
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getRandomPosition = () => {
  return {
    x: (Math.random() - 0.5) * 400,
    y: (Math.random() - 0.5) * 400
  };
};

const addRandomElement = () => {
  const types = ['line', 'circle', 'rect', 'text'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const pos = getRandomPosition();
  const color = getRandomColor();
  
  let element;
  
  switch (randomType) {
    case 'line':
      element = {
        id: 'line_' + Date.now(),
        type: 'line',
        points: [pos.x, pos.y, pos.x + Math.random() * 100, pos.y + Math.random() * 100],
        stroke: color,
        strokeWidth: 2 + Math.random() * 3
      };
      break;
    case 'circle':
      element = {
        id: 'circle_' + Date.now(),
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 10 + Math.random() * 20,
        fill: color,
        stroke: 'black',
        strokeWidth: 1
      };
      break;
    case 'rect':
      element = {
        id: 'rect_' + Date.now(),
        type: 'rect',
        x: pos.x,
        y: pos.y,
        width: 20 + Math.random() * 40,
        height: 20 + Math.random() * 40,
        fill: color,
        stroke: 'black',
        strokeWidth: 1
      };
      break;
    case 'text':
      element = {
        id: 'text_' + Date.now(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: '测试文本' + Math.floor(Math.random() * 100),
        fontSize: 12 + Math.random() * 12,
        fontFamily: 'Arial',
        fill: color
      };
      break;
  }
  
  if (element) {
    canvas3.value.addElement(element);
  }
};

const addMultipleElements = () => {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => addRandomElement(), i * 200);
  }
};

const clearElements = () => {
  elements.value = [];
};

const onElementAdded = (element) => {
  console.log('元素已添加:', element);
};

const onElementUpdated = (element) => {
  console.log('元素已更新:', element);
};

// 4. 测试导出功能
const addSampleContent = () => {
  if (!canvas4.value) return;
  
  // 添加一些示例内容以供导出
  const sampleElements = [
    // 标题
    {
      id: 'title_text',
      type: 'text',
      x: -80,
      y: -100,
      text: '画布导出测试',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: 'black'
    },
    // 背景矩形
    {
      id: 'bg_rect',
      type: 'rect',
      x: -150,
      y: -70,
      width: 300,
      height: 200,
      fill: '#f5f5f5',
      stroke: '#999',
      strokeWidth: 1
    },
    // 红色圆形
    {
      id: 'red_circle',
      type: 'circle',
      x: -80,
      y: 0,
      radius: 40,
      fill: '#FF5733',
      stroke: '#333',
      strokeWidth: 2
    },
    // 蓝色圆形
    {
      id: 'blue_circle',
      type: 'circle',
      x: 80,
      y: 0,
      radius: 40,
      fill: '#3357FF',
      stroke: '#333',
      strokeWidth: 2
    },
    // 连接线
    {
      id: 'connect_line',
      type: 'line',
      points: [-80, 0, 80, 0],
      stroke: '#333',
      strokeWidth: 3
    },
    // 说明文本
    {
      id: 'desc_text',
      type: 'text',
      x: -100,
      y: 70,
      text: '点击"导出为图片"按钮导出此内容',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 'black'
    }
  ];
  
  // 清除现有内容并添加示例元素
  canvas4.value.resetView();
  
  // 延迟添加元素，确保视图重置完成
  setTimeout(() => {
    sampleElements.forEach(element => {
      canvas4.value.addElement(element);
    });
  }, 100);
};

// 1. 导出指定范围
const exportSpecificArea = () => {
  if (!canvas4.value) return;
  
  // 导出指定区域的画布内容（比可见区域更大）
  exportedImage.value = canvas4.value.exportCanvasAsImage({
    pixelRatio: 2,
    mimeType: 'image/png',
    bounds: {
      x: -200,  // 左上角X坐标（世界坐标系）
      y: -150,  // 左上角Y坐标（世界坐标系）
      width: 400, // 导出区域宽度
      height: 300 // 导出区域高度
    }
  });
};

// 2. 导出指定元素
const exportSpecificElements = () => {
  if (!canvas4.value) return;
  
  // 获取特定ID的元素
  const elementsToExport = ['red_circle', 'blue_circle', 'connect_line'];
  
  // 导出特定元素
  exportedImage.value = canvas4.value.exportCanvasAsImage({
    pixelRatio: 2,
    mimeType: 'image/png',
    elementIds: elementsToExport
  });
};

// 3. 添加大量元素测试
const addMassiveElements = () => {
  if (!canvas4.value) return;
  
  // 清除现有内容
  canvas4.value.resetView();
  
  // 延迟添加元素
  setTimeout(() => {
    // 准备添加1000个随机小圆点
    const count = 1000;
    const bounds = {
      minX: -300,
      maxX: 300,
      minY: -200,
      maxY: 200
    };
    
    console.time('添加巨量元素');
    
    // 批量添加元素
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      const radius = 2 + Math.random() * 4;
      
      // 创建随机颜色
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      const opacity = 0.3 + Math.random() * 0.7;
      
      const element = {
        id: `dot_${i}`,
        type: 'circle',
        x: x,
        y: y,
        radius: radius,
        fill: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        stroke: 'rgba(0,0,0,0.2)',
        strokeWidth: 0.5
      };
      
      canvas4.value.addElement(element);
    }
    
    console.timeEnd('添加巨量元素');
  }, 100);
};

// 修改现有导出函数，支持添加的测试
const exportCanvas = () => {
  if (!canvas4.value) return;
  
  // 导出画布为图片
  exportedImage.value = canvas4.value.exportCanvasAsImage({
    pixelRatio: 2,
    mimeType: 'image/png'
  });
};

onMounted(() => {
  // 在组件挂载后初始化一些功能
  setTimeout(() => {
    // 为第四个画布添加一些初始内容
    if (canvas4.value) {
      addSampleContent();
    }
  }, 500);
});
</script>

<style scoped>
.canvas-test-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.test-title {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.canvas-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  height: 80vh;
}

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
}

.canvas-controls button:hover {
  background: #3367d6;
}

.export-preview {
  padding: 10px;
  margin-top: 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 150px;
  overflow: auto;
  text-align: center;
}

.export-preview img {
  max-width: 100%;
  max-height: 130px;
  border: 1px solid #eee;
}
</style>