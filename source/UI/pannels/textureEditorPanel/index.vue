<template>
  <div class="canvas-test-container">
    <h1 class="test-title">无限画布测试</h1>
    
    <div class="canvas-grid">
      <!-- 画布 1：基本功能测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">基本缩放与平移</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas1" 
            :initialScale="1" 
            :gridSize="50"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="testZoomIn(1)">放大</button>
          <button @click="testZoomOut(1)">缩小</button>
          <button @click="resetView(1)">重置视图</button>
        </div>
      </div>
      
      <!-- 画布 2：网格系统测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">网格系统</h2>
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
        </div>
        <div v-if="exportedImage" class="export-preview">
          <img :src="exportedImage" alt="导出预览" />
        </div>
      </div>

      <!-- 画布 5：LOD与平移约束测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">LOD与平移约束</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas5" 
            :initialScale="1" 
            :gridSize="50"
            :maxLodLevel="maxLodLevel"
            :minLodLevel="minLodLevel"
            :maxPanDistance="maxPanDistance"
            :constrainPan="constrainPan"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <div class="control-group">
            <label>LOD限制:</label>
            <button @click="setLodLevels(0, 2)">低LOD范围(0-2)</button>
            <button @click="setLodLevels(0, 5)">全LOD范围(0-5)</button>
          </div>
          <div class="control-group">
            <label>平移约束:</label>
            <button @click="togglePanConstraint">{{ constrainPan ? '禁用约束' : '启用约束' }}</button>
            <button @click="setMaxPanDistance(500)" :disabled="!constrainPan">设置约束500px</button>
            <button @click="setMaxPanDistance(200)" :disabled="!constrainPan">设置约束200px</button>
          </div>
          <button @click="addTestElements(5)">添加测试元素</button>
          <button @click="resetView(5)">重置视图</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import InfiniteCanvas from './InfiniteCanvas.vue';

// 引用五个画布
const canvas1 = ref(null);
const canvas2 = ref(null);
const canvas3 = ref(null);
const canvas4 = ref(null);
const canvas5 = ref(null);

// 为画布3提供元素数组
const elements = ref([]);

// 导出预览图片
const exportedImage = ref(null);

// 画布5的LOD和平移约束配置
const maxLodLevel = ref(5);
const minLodLevel = ref(0);
const maxPanDistance = ref(Infinity);
const constrainPan = ref(false);

// 1. 基本缩放和平移功能
const testZoomIn = (canvasId) => {
  const canvas = canvasId === 1 ? canvas1.value : 
                canvasId === 5 ? canvas5.value : null;
  if (!canvas) return;
  canvas.zoomIn();
};

const testZoomOut = (canvasId) => {
  const canvas = canvasId === 1 ? canvas1.value : 
                canvasId === 5 ? canvas5.value : null;
  if (!canvas) return;
  canvas.zoomOut();
};

const resetView = (canvasId) => {
  const canvas = canvasId === 1 ? canvas1.value : 
                canvasId === 5 ? canvas5.value : null;
  if (!canvas) return;
  canvas.resetView();
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

// 导出指定范围
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

// 导出指定元素
const exportCanvas = () => {
  if (!canvas4.value) return;
  
  // 导出画布为图片
  exportedImage.value = canvas4.value.exportCanvasAsImage({
    pixelRatio: 2,
    mimeType: 'image/png'
  });
};

// 5. 测试LOD与平移约束功能
const setLodLevels = (min, max) => {
  minLodLevel.value = min;
  maxLodLevel.value = max;
};

const togglePanConstraint = () => {
  constrainPan.value = !constrainPan.value;
  
  // 如果启用约束但没有设置约束值，设置一个默认值
  if (constrainPan.value && maxPanDistance.value === Infinity) {
    maxPanDistance.value = 500;
  }
};

const setMaxPanDistance = (distance) => {
  maxPanDistance.value = distance;
};

const addTestElements = (canvasId) => {
  const canvas = canvasId === 5 ? canvas5.value : null;
  if (!canvas) return;
  
  // 添加一些测试元素，便于观察LOD和平移约束效果
  // 首先清除画布
  canvas.resetView();
  
  // 创建从原点发散的同心圆
  setTimeout(() => {
    // 创建中心标记
    canvas.addElement({
      id: 'origin_marker',
      type: 'text',
      x: 0,
      y: 0,
      text: '原点(0,0)',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 'black',
      align: 'center'
    });
    
    // 创建水平垂直参考线
    canvas.addElement({
      id: 'h_reference_line',
      type: 'line',
      points: [-1000, 0, 1000, 0],
      stroke: '#999999',
      strokeWidth: 1,
      dash: [5, 5]
    });
    
    canvas.addElement({
      id: 'v_reference_line',
      type: 'line',
      points: [0, -1000, 0, 1000],
      stroke: '#999999',
      strokeWidth: 1,
      dash: [5, 5]
    });
    
    // 添加几个同心圆，标注距离
    const radiusValues = [100, 200, 500, 1000];
    
    radiusValues.forEach((radius, index) => {
      // 添加圆
      canvas.addElement({
        id: `circle_${radius}`,
        type: 'circle',
        x: 0,
        y: 0,
        radius: radius,
        stroke: '#3357FF',
        strokeWidth: 2,
        dash: [8, 4],
        fill: 'rgba(51, 87, 255, 0.05)'
      });
      
      // 添加标签
      canvas.addElement({
        id: `label_${radius}`,
        type: 'text',
        x: 0,
        y: -radius - 20,
        text: `${radius}px`,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: '#3357FF',
        align: 'center'
      });
    });
    
    // 在每象限添加一些指示性元素
    const quadrants = [
      { x: 300, y: -300, name: '第一象限', color: '#FF5733' },
      { x: -300, y: -300, name: '第二象限', color: '#33FF57' },
      { x: -300, y: 300, name: '第三象限', color: '#3357FF' },
      { x: 300, y: 300, name: '第四象限', color: '#F3FF33' }
    ];
    
    quadrants.forEach((q, i) => {
      canvas.addElement({
        id: `quadrant_${i + 1}`,
        type: 'rect',
        x: q.x - 50,
        y: q.y - 50,
        width: 100,
        height: 100,
        fill: q.color,
        stroke: 'black',
        strokeWidth: 1
      });
      
      canvas.addElement({
        id: `quadrant_label_${i + 1}`,
        type: 'text',
        x: q.x,
        y: q.y,
        text: q.name,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 'black',
        align: 'center'
      });
    });
  }, 100);
};

onMounted(() => {
  // 在组件挂载后初始化一些功能
  setTimeout(() => {
    // 为第四个画布添加一些初始内容
    if (canvas4.value) {
      addSampleContent();
    }
    
    // 为第五个画布添加测试元素
    if (canvas5.value) {
      addTestElements(5);
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
  grid-auto-rows: minmax(400px, auto);
  gap: 20px;
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

.control-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-right: 12px;
  border-right: 1px solid #ddd;
  padding-right: 12px;
}

.control-group:last-child {
  border-right: none;
}

.control-group label {
  font-weight: bold;
  font-size: 14px;
  color: #555;
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