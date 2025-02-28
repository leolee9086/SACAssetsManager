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

      <!-- 画布 6：性能测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">性能测试（一万个元素）</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas6" 
            :initialScale="0.5" 
            :gridSize="100"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="addBulkElements" :disabled="isGenerating">一次性添加一万个元素</button>
          <button @click="addElementsOneByOne" :disabled="isGenerating">逐个添加一万个元素</button>
          <button @click="addHexagonGrid" :disabled="isGenerating">添加蜂巢网格(1000个)</button>
          <button @click="clearPerformanceCanvas">清除元素</button>
          <div v-if="generationInfo" class="generation-info">
            {{ generationInfo }}
          </div>
        </div>
      </div>

      <!-- 画布 7：六边形网格测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">六边形网格测试</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas7" 
            :initialScale="0.8" 
            :gridSize="100"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="addHexagonGrid">生成蜂巢网格(1000个)</button>
          <button @click="clearHexagonCanvas">清除网格</button>
          <div class="control-group">
            <label>六边形大小:</label>
            <button @click="updateHexSize(15)">小(15px)</button>
            <button @click="updateHexSize(20)">中(20px)</button>
            <button @click="updateHexSize(30)">大(30px)</button>
          </div>
          <div v-if="hexagonInfo" class="generation-info">
            {{ hexagonInfo }}
          </div>
        </div>
      </div>

      <!-- 画布 8：元素级LOD测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">元素级LOD测试</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas8" 
            :initialScale="1.0" 
            :gridSize="50"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="addLodTestElements">添加测试元素</button>
          <button @click="clearLodCanvas">清除元素</button>
          <div class="control-group">
            <label>元素LOD范围:</label>
            <button @click="setElementLodRanges('narrow')">窄范围(0.5-2.0)</button>
            <button @click="setElementLodRanges('medium')">中等范围(0.3-3.0)</button>
            <button @click="setElementLodRanges('wide')">宽范围(0.1-10.0)</button>
          </div>
          <div v-if="lodTestInfo" class="generation-info">
            {{ lodTestInfo }}
          </div>
        </div>
      </div>

      <!-- 画布 9：时光隧道效果测试 -->
      <div class="canvas-wrapper">
        <h2 class="canvas-title">时光隧道效果测试</h2>
        <div class="canvas-box">
          <InfiniteCanvas 
            ref="canvas9" 
            :initialScale="1.0" 
            :gridSize="50"
            :showMouseIndicator="true"
          />
        </div>
        <div class="canvas-controls">
          <button @click="createTimeTunnel">创建时光隧道</button>
          <button @click="clearTimeTunnel">清除隧道</button>
          <div class="control-group">
            <label>隧道深度:</label>
            <button @click="setTunnelDepth(5)">浅(5层)</button>
            <button @click="setTunnelDepth(10)">中(10层)</button>
            <button @click="setTunnelDepth(20)">深(20层)</button>
          </div>
          <div v-if="tunnelInfo" class="generation-info">
            {{ tunnelInfo }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import InfiniteCanvas from './InfiniteCanvas.vue';

// 引用八个画布
const canvas1 = ref(null);
const canvas2 = ref(null);
const canvas3 = ref(null);
const canvas4 = ref(null);
const canvas5 = ref(null);
const canvas6 = ref(null);
const canvas7 = ref(null);
const canvas8 = ref(null);
const canvas9 = ref(null);

// 为画布3提供元素数组
const elements = ref([]);

// 导出预览图片
const exportedImage = ref(null);

// 画布5的LOD和平移约束配置
const maxLodLevel = ref(5);
const minLodLevel = ref(0);
const maxPanDistance = ref(Infinity);
const constrainPan = ref(false);

// 性能测试状态变量
const isGenerating = ref(false);
const generationInfo = ref('');

// 六边形网格相关状态
const hexagonInfo = ref('');
const currentHexSize = ref(20);

// 元素级LOD测试相关状态
const lodTestInfo = ref('');
const lodTestElements = ref([]);
const currentLodRange = ref('medium');

// 时光隧道相关状态
const tunnelInfo = ref('');
const tunnelDepth = ref(10);
const tunnelElements = ref([]);

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

// 6. 性能测试功能
const generateElements = (count) => {
  const elements = [];
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', 
                 '#33FFF5', '#FF8033', '#8033FF', '#FFFF33', '#FF33A8'];
  const types = ['circle', 'rect', 'line'];
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let element;
    switch (type) {
      case 'circle':
        element = {
          id: `perf_circle_${i}`,
          type: 'circle',
          x: x,
          y: y,
          radius: 2 + Math.random() * 6,
          fill: color,
          opacity: 0.7 + Math.random() * 0.3
        };
        break;
      case 'rect':
        const size = 4 + Math.random() * 8;
        element = {
          id: `perf_rect_${i}`,
          type: 'rect',
          x: x,
          y: y,
          width: size,
          height: size,
          fill: color,
          opacity: 0.7 + Math.random() * 0.3
        };
        break;
      case 'line':
        const length = 5 + Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;
        element = {
          id: `perf_line_${i}`,
          type: 'line',
          points: [
            x, 
            y, 
            x + Math.cos(angle) * length, 
            y + Math.sin(angle) * length
          ],
          stroke: color,
          strokeWidth: 1 + Math.random() * 2,
          opacity: 0.7 + Math.random() * 0.3
        };
        break;
    }
    
    if (element) {
      elements.push(element);
    }
  }
  
  return elements;
};

const addBulkElements = async () => {
  if (!canvas6.value || isGenerating.value) return;
  
  isGenerating.value = true;
  generationInfo.value = '正在生成元素...';
  
  // 先清除画布
  clearPerformanceCanvas();
  
  // 延迟执行，确保UI更新
  setTimeout(async () => {
    const startTime = performance.now();
    
    // 生成元素
    generationInfo.value = '正在生成一万个元素...';
    const elements = generateElements(10000);
    const generationTime = performance.now() - startTime;
    
    // 添加元素
    generationInfo.value = '正在将一万个元素添加到画布...';
    await new Promise(resolve => setTimeout(resolve, 50)); // 允许UI更新
    
    const drawStartTime = performance.now();
    canvas6.value.addElements(elements);
    const drawTime = performance.now() - drawStartTime;
    
    // 更新信息
    generationInfo.value = `完成！\n元素生成时间: ${generationTime.toFixed(2)}ms\n元素绘制时间: ${drawTime.toFixed(2)}ms\n总耗时: ${(generationTime + drawTime).toFixed(2)}ms`;
    isGenerating.value = false;
  }, 100);
};

const addElementsOneByOne = async () => {
  if (!canvas6.value || isGenerating.value) return;
  
  isGenerating.value = true;
  generationInfo.value = '正在生成元素...';
  
  // 先清除画布
  clearPerformanceCanvas();
  
  // 延迟执行，确保UI更新
  setTimeout(async () => {
    const startTime = performance.now();
    
    // 生成元素
    generationInfo.value = '正在生成一万个元素...';
    const elements = generateElements(10000);
    const generationTime = performance.now() - startTime;
    
    // 逐个添加元素
    generationInfo.value = '正在逐个添加元素到画布...';
    await new Promise(resolve => setTimeout(resolve, 50)); // 允许UI更新
    
    const drawStartTime = performance.now();
    
    // 使用requestAnimationFrame分批添加，避免UI阻塞
    const batchSize = 100; // 每批添加100个元素
    let index = 0;
    
    const addBatch = () => {
      const end = Math.min(index + batchSize, elements.length);
      const batch = elements.slice(index, end);
      
      if (batch.length > 0) {
        canvas6.value.addElements(batch);
        index = end;
        
        // 更新进度
        const progress = Math.round((index / elements.length) * 100);
        generationInfo.value = `添加进度: ${progress}% (${index}/10000)`;
        
        if (index < elements.length) {
          requestAnimationFrame(addBatch);
        } else {
          const drawTime = performance.now() - drawStartTime;
          generationInfo.value = `完成！\n元素生成时间: ${generationTime.toFixed(2)}ms\n元素逐批添加时间: ${drawTime.toFixed(2)}ms\n总耗时: ${(generationTime + drawTime).toFixed(2)}ms`;
          isGenerating.value = false;
        }
      }
    };
    
    addBatch();
  }, 100);
};

const clearPerformanceCanvas = () => {
  if (!canvas6.value) return;
  canvas6.value.resetView();
  generationInfo.value = '';
};

// 添加生成六边形网格的函数
const generateHexagonPoints = (centerX, centerY, size) => {
  const points = [];
  // 从正上方开始，顺时针生成六个顶点
  for (let i = 0; i <= 6; i++) {  // 注意这里改为 <= 6，以确保闭合
    const angle = (Math.PI / 3) * i - Math.PI / 2; // 从正上方开始
    points.push(
      centerX + size * Math.cos(angle),
      centerY + size * Math.sin(angle)
    );
  }
  return points;
};

const updateHexSize = (size) => {
  currentHexSize.value = size;
  // 如果已经有网格，重新生成
  if (hexagonInfo.value) {
    addHexagonGrid();
  }
};

const addHexagonGrid = async () => {
  if (!canvas7.value) return;
  
  hexagonInfo.value = '正在生成蜂巢网格...';
  
  clearHexagonCanvas();
  
  setTimeout(async () => {
    const startTime = performance.now();
    const elements = [];
    const hexSize = currentHexSize.value;
    
    // 调整间距计算以实现紧密排列
    const width = hexSize * 2;  // 六边形的宽度
    const height = Math.sqrt(3) * hexSize;  // 六边形的高度
    const horizontalSpacing = width * 3/4;  // 水平间距
    const verticalSpacing = height;  // 垂直间距
    
    const rows = Math.ceil(Math.sqrt(1000) / 2);
    const cols = Math.ceil(Math.sqrt(1000) / 2);
    let count = 0;

    // 生成蜂巢状的六边形网格
    for (let row = -rows; row <= rows && count < 1000; row++) {
      for (let col = -cols; col <= cols && count < 1000; col++) {
        // 调整偏移量以实现紧密排列
        const x = col * horizontalSpacing;
        const y = row * verticalSpacing + (col % 2 ? height/2 : 0);
        
        elements.push({
          id: `hexagon_${count}`,
          type: 'line',
          points: generateHexagonPoints(x, y, hexSize),
          stroke: '#3357FF',
          strokeWidth: 1,
          fill: 'rgba(51, 87, 255, 0.1)',
          closed: true,
          tension: 0  // 确保线段是直的
        });
        
        // 如果是第一个六边形（位于原点附近），添加标记
        if (count === 0) {
          elements.push({
            id: 'origin_marker',
            type: 'text',
            x: x,
            y: y - hexSize - 10,
            text: '原点六边形',
            fontSize: 14,
            fontFamily: 'Arial',
            fill: '#3357FF',
            align: 'center'
          });
        }
        
        count++;
      }
    }

    const generationTime = performance.now() - startTime;
    
    hexagonInfo.value = '正在添加六边形到画布...';
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const drawStartTime = performance.now();
    canvas7.value.addElements(elements);
    const drawTime = performance.now() - drawStartTime;
    
    hexagonInfo.value = `完成！\n生成了 ${count} 个六边形\n六边形边长: ${hexSize}px\n生成时间: ${generationTime.toFixed(2)}ms\n绘制时间: ${drawTime.toFixed(2)}ms\n总耗时: ${(generationTime + drawTime).toFixed(2)}ms`;
  }, 100);
};

const clearHexagonCanvas = () => {
  if (!canvas7.value) return;
  canvas7.value.resetView();
  hexagonInfo.value = '';
};

// 添加元素级LOD测试相关函数
const addLodTestElements = () => {
  if (!canvas8.value) return;
  
  lodTestInfo.value = '正在生成具有不同LOD范围的测试元素...';
  clearLodCanvas();
  
  setTimeout(() => {
    const startTime = performance.now();
    
    // 添加中心标记
    canvas8.value.addElement({
      id: 'lod_center_marker',
      type: 'text',
      x: 0,
      y: 0,
      text: '原点(0,0)',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 'black',
      align: 'center',
      isSystemElement: true
    });
    
    // 添加不同颜色的圆环，每个设置不同的LOD范围
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
    const radii = [50, 100, 150, 200, 250];
    const elements = [];
    
    colors.forEach((color, index) => {
      const radius = radii[index];
      const circleId = `lod_circle_${radius}`;
      const element = {
        id: circleId,
        type: 'circle',
        x: 0,
        y: 0,
        radius: radius,
        stroke: color,
        strokeWidth: 5,
        fill: 'transparent'
      };
      
      elements.push(element);
      
      // 添加标签
      elements.push({
        id: `lod_label_${radius}`,
        type: 'text',
        x: 0,
        y: -radius - 15,
        text: `圆环 ${radius}px`,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: color,
        align: 'center'
      });
    });
    
    // 添加方形区域作为额外测试
    for (let i = 0; i < 4; i++) {
      const size = 40;
      const posX = 300 * Math.cos(i * Math.PI / 2);
      const posY = 300 * Math.sin(i * Math.PI / 2);
      
      elements.push({
        id: `lod_square_${i}`,
        type: 'rect',
        x: posX - size / 2,
        y: posY - size / 2,
        width: size,
        height: size,
        fill: colors[i % colors.length],
        stroke: 'black',
        strokeWidth: 1
      });
      
      elements.push({
        id: `lod_square_label_${i}`,
        type: 'text',
        x: posX,
        y: posY + size/2 + 15,
        text: `方形 ${i+1}`,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 'black',
        align: 'center'
      });
    }
    
    // 添加所有元素到画布
    canvas8.value.addElements(elements);
    lodTestElements.value = elements;
    
    // 根据选择的范围设置LOD
    setElementLodRanges(currentLodRange.value);
    
    const endTime = performance.now();
    lodTestInfo.value = `已添加 ${elements.length} 个测试元素，耗时: ${(endTime - startTime).toFixed(2)}ms\n当前LOD范围: ${getLodRangeDescription(currentLodRange.value)}\n缩放查看不同元素的显示/隐藏效果`;
  }, 100);
};

const clearLodCanvas = () => {
  if (!canvas8.value) return;
  canvas8.value.resetView();
  lodTestElements.value = [];
  lodTestInfo.value = '';
};

const getLodRangeDescription = (range) => {
  switch(range) {
    case 'narrow': return '窄范围(0.5-2.0)';
    case 'medium': return '中等范围(0.3-3.0)';
    case 'wide': return '宽范围(0.1-10.0)';
    default: return '未设置';
  }
};

const setElementLodRanges = (range) => {
  if (!canvas8.value || lodTestElements.value.length === 0) return;
  
  currentLodRange.value = range;
  
  // 定义不同范围的LOD设置
  const ranges = {
    narrow: { min: 0.5, max: 2.0 },
    medium: { min: 0.3, max: 3.0 },
    wide: { min: 0.1, max: 10.0 }
  };
  
  const selectedRange = ranges[range] || ranges.medium;
  
  // 为不同元素设置不同的LOD范围
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
  const radii = [50, 100, 150, 200, 250];
  
  radii.forEach((radius, index) => {
    const circleId = `lod_circle_${radius}`;
    const labelId = `lod_label_${radius}`;
    
    // 不同的圆环设置稍微不同的LOD范围
    const minScale = selectedRange.min * (1 + index * 0.2);
    const maxScale = selectedRange.max / (1 + index * 0.1);
    
    // 设置圆的LOD范围
    canvas8.value.setElementLodRange(circleId, minScale, maxScale);
    
    // 标签与圆使用相同的LOD范围
    canvas8.value.setElementLodRange(labelId, minScale, maxScale);
  });
  
  // 设置方形元素的LOD范围
  for (let i = 0; i < 4; i++) {
    const squareId = `lod_square_${i}`;
    const labelId = `lod_square_label_${i}`;
    
    // 四个方向的方形使用不同的LOD范围
    let minScale, maxScale;
    
    switch(i) {
      case 0: // 上方 - 只在放大时可见
        minScale = selectedRange.min * 2;
        maxScale = selectedRange.max * 2;
        break;
      case 1: // 右方 - 只在缩小时可见
        minScale = selectedRange.min / 2;
        maxScale = selectedRange.min;
        break;
      case 2: // 下方 - 在中等缩放时可见
        minScale = (selectedRange.min + selectedRange.max) / 3;
        maxScale = (selectedRange.min + selectedRange.max) * 2/3;
        break;
      case 3: // 左方 - 无LOD限制，始终可见
        minScale = 0.0001;
        maxScale = 10000;
        break;
    }
    
    canvas8.value.setElementLodRange(squareId, minScale, maxScale);
    canvas8.value.setElementLodRange(labelId, minScale, maxScale);
  }
  
  lodTestInfo.value = `已为所有元素设置LOD范围: ${getLodRangeDescription(range)}\n不同元素有略微不同的可见范围，请缩放查看效果`;
};

// 时光隧道相关功能
const setTunnelDepth = (depth) => {
  tunnelDepth.value = depth;
  if (tunnelElements.value.length > 0) {
    // 如果已经创建了隧道，重新创建
    createTimeTunnel();
  }
};

const clearTimeTunnel = () => {
  if (!canvas9.value) return;
  canvas9.value.resetView();
  tunnelElements.value = [];
  tunnelInfo.value = '';
};

const createTimeTunnel = () => {
  if (!canvas9.value) return;
  return
  tunnelInfo.value = '正在生成时光隧道...';
  clearTimeTunnel();
  
  setTimeout(() => {
    const startTime = performance.now();
    const depth = tunnelDepth.value;
    const elements = [];
    
    // 添加中心标记
    elements.push({
      id: 'tunnel_center',
      type: 'text',
      x: 0,
      y: 0,
      text: '隧道中心点',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 'black',
      align: 'center'
    });
    
    // 创建时光隧道的层次结构
    const colors = [
      '#FF5733', '#FF8C33', '#FFBD33', '#FFFB33', 
      '#BDFF33', '#75FF33', '#33FF51', '#33FFBD',
      '#33DCFF', '#3384FF', '#5133FF', '#9C33FF',
      '#FF33F5', '#FF3384'
    ];
    
    // 计算半径和LOD范围的函数
    const calculateRadius = (ringIndex, level) => {
      // 基础半径随层级递增
      const baseRadius = 50 * Math.pow(1.5, level);
      // 在同一层级内平滑变化
      const levelProgress = (ringIndex % 50) / 50;
      return baseRadius * (1 + levelProgress * 0.5);
    };
    
    // 基于半径计算LOD范围的函数
    const calculateLodRange = (radius) => {
      const baseMinScale = 2.0;
      const baseMaxScale = 8.0;
      const factor = 0.6; // 衰减因子
      
      // 使用对数关系: 半径越大，LOD范围越小
      const minScale = baseMinScale * Math.pow(radius/100, -factor);
      const maxScale = baseMaxScale * Math.pow(radius/100, -factor);
      
      return {
        min: Math.max(0.01, minScale), // 确保最小值不低于0.01
        max: Math.max(0.05, maxScale)  // 确保最大值不低于0.05
      };
    };
    
    // 计算视觉属性的函数
    const calculateVisualProps = (radius, ringIndex, level) => {
      // 线宽随半径增加而增加，但有上限
      const strokeWidth = Math.min(4, 1 + radius / 200);
      
      // 透明度随半径减小
      const opacity = Math.max(0.3, 1 - radius / 2000);
      
      // 是否使用虚线 - 有规律地分布
      const isDashed = (ringIndex % 7 === 0);
      
      return {
        strokeWidth,
        opacity,
        isDashed
      };
    };
    
    let elementCount = 1; // 已添加的元素数（中心点）
    const targetCount = 10000; // 固定为一万个元素
    
    // 创建系统化的层级设计
    const maxLevels = depth * 2; // 根据深度参数确定层级数
    
    // 第一阶段：按层级生成圆环
    for (let level = 0; level < maxLevels && elementCount < targetCount; level++) {
      // 每个层级的圆环数，随层级增加而减少
      const ringsPerLevel = Math.max(10, Math.floor(500 / (level + 1)));
      
      for (let i = 0; i < ringsPerLevel && elementCount < targetCount; i++) {
        const ringIndex = (level * 500) + i;
        const radius = calculateRadius(ringIndex, level);
        const lodRange = calculateLodRange(radius);
        const visualProps = calculateVisualProps(radius, ringIndex, level);
        const colorIndex = (level + i) % colors.length;
        
        // 主环
        elements.push({
          id: `tunnel_ring_${ringIndex}`,
          type: 'circle',
          x: 0,
          y: 0,
          radius: radius,
          stroke: colors[colorIndex],
          strokeWidth: visualProps.strokeWidth,
          dash: visualProps.isDashed ? [5, 5] : undefined,
          fill: 'transparent',
          opacity: visualProps.opacity,
          lodMinScale: lodRange.min,
          lodMaxScale: lodRange.max,
          lodTransitionType: 'fade'
        });
        elementCount++;
        
        // 为部分圆环添加内环，创造更丰富的视觉效果
        if (i % 3 === 0 && elementCount < targetCount) {
          const innerRadius = radius * 0.9;
          const innerLodRange = calculateLodRange(innerRadius);
          
          elements.push({
            id: `tunnel_inner_ring_${ringIndex}`,
            type: 'circle',
            x: 0,
            y: 0,
            radius: innerRadius,
            stroke: colors[(colorIndex + 1) % colors.length],
            strokeWidth: Math.max(1, visualProps.strokeWidth - 1),
            dash: [3, 3],
            fill: 'transparent',
            opacity: visualProps.opacity * 0.8,
            lodMinScale: innerLodRange.min,
            lodMaxScale: innerLodRange.max,
            lodTransitionType: 'fade'
          });
          elementCount++;
        }
      }
    }
    
    // 第二阶段：填充剩余元素，确保到达一万个
    const remainingCount = targetCount - elementCount;
    if (remainingCount > 0) {
      tunnelInfo.value = `已生成 ${elementCount} 个结构化圆环，正在填充剩余 ${remainingCount} 个...`;
      
      // 批量生成圆环
      const batchSize = 1000;
      const batchCount = Math.ceil(remainingCount / batchSize);
      
      for (let b = 0; b < batchCount; b++) {
        const startIndex = elementCount;
        const endIndex = Math.min(startIndex + batchSize, targetCount);
        const count = endIndex - startIndex;
        
        for (let i = 0; i < count; i++) {
          const ringIndex = startIndex + i;
          
          // 使用非线性函数创造多样化的半径
          const level = maxLevels + Math.floor(ringIndex / 200);
          const radius = calculateRadius(ringIndex, level);
          const lodRange = calculateLodRange(radius);
          const visualProps = calculateVisualProps(radius, ringIndex, level);
          const colorIndex = ringIndex % colors.length;
          
          elements.push({
            id: `tunnel_extra_ring_${ringIndex}`,
            type: 'circle',
            x: 0,
            y: 0,
            radius: radius,
            stroke: colors[colorIndex],
            strokeWidth: visualProps.strokeWidth,
            dash: visualProps.isDashed ? [5, 5] : undefined,
            fill: 'transparent',
            opacity: visualProps.opacity,
            lodMinScale: lodRange.min,
            lodMaxScale: lodRange.max,
            lodTransitionType: 'fade'
          });
          elementCount++;
        }
      }
    }
    
    // 添加指导文字
    elements.push({
      id: 'tunnel_instructions',
      type: 'text',
      x: 0,
      y: -200,
      text: '不断放大或缩小以体验一万个圆环构成的时光隧道效果\n随着缩放级别变化，不同层级的圆环将出现或消失',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: 'black',
      align: 'center',
      lodMinScale: 0.1,
      lodMaxScale: 50
    });
    elementCount++;
    
    // 添加所有元素到画布，使用分批添加以避免界面冻结
    tunnelInfo.value = `准备添加 ${elements.length} 个圆环到画布...`;
    
    // 分批添加元素，每批1000个
    const addBatchSize = 1000;
    const addBatchCount = Math.ceil(elements.length / addBatchSize);
    
    const addElementBatch = (batchIndex) => {
      const start = batchIndex * addBatchSize;
      const end = Math.min(start + addBatchSize, elements.length);
      const batch = elements.slice(start, end);
      
      canvas9.value.addElements(batch);
      
      const progress = Math.round(((batchIndex + 1) * addBatchSize / elements.length) * 100);
      tunnelInfo.value = `正在添加圆环: ${Math.min(end, elements.length)}/${elements.length} (${progress}%)`;
      
      if (batchIndex + 1 < addBatchCount) {
        setTimeout(() => addElementBatch(batchIndex + 1), 30);
      } else {
        const endTime = performance.now();
        tunnelElements.value = elements;
        tunnelInfo.value = `已生成时光隧道，共 ${elements.length} 个圆环元素，${depth} 层递归结构\n生成耗时: ${(endTime - startTime).toFixed(2)}ms\n请放大和缩小以体验无限隧道效果`;
      }
    };
    
    // 开始分批添加
    addElementBatch(0);
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
    
    // 为第七个画布添加初始网格
    if (canvas7.value) {
      setTimeout(() => {
        addHexagonGrid();
      }, 500);
    }
    
    // 为第八个画布添加LOD测试元素
    if (canvas8.value) {
      setTimeout(() => {
        addLodTestElements();
      }, 600);
    }
    
    // 为第九个画布创建时光隧道
    if (canvas9.value) {
      setTimeout(() => {
        createTimeTunnel();
      }, 700);
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

.generation-info {
  margin-top: 8px;
  padding: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-line;
  color: #333;
  width: 100%;
}
</style>