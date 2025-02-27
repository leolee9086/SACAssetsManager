<template>
  <div ref="canvasContainer" class="infinite-canvas-container" @wheel="handleWheel" @mousedown="startPan"
    @mouseup="stopPan" @mousemove="onMouseMove" @mouseleave="stopPan">

    <!-- DOM层，位于Canvas下方 -->
    <div class="dom-layer" :style="domLayerStyle">
      <slot name="dom-elements"></slot>
    </div>

    <!-- Konva画布 -->
    <v-stage ref="stage" :config="stageConfig" @mousedown="onStageMouseDown" @mouseup="onStageMouseUp"
      @mousemove="onStageMouseMove">

      <!-- 背景层 -->
      <v-layer ref="backgroundLayer">
        <!-- 网格和坐标轴 -->
        <v-group ref="gridGroup">
          <!-- 网格线由代码动态生成 -->
        </v-group>
      </v-layer>

      <!-- 主要内容层 -->
      <v-layer ref="mainLayer">
        <slot></slot>
      </v-layer>

      <!-- UI层（坐标轴、鼠标指示器等） -->
      <v-layer ref="uiLayer">
        <!-- 坐标轴 -->
        <v-line :config="xAxisConfig"></v-line>
        <v-line :config="yAxisConfig"></v-line>

        <!-- 鼠标位置指示器 -->
        <v-group v-if="showMouseIndicator">
          <v-line :config="mouseHorizontalLine"></v-line>
          <v-line :config="mouseVerticalLine"></v-line>
          <v-text :config="mousePositionText"></v-text>
        </v-group>
      </v-layer>
    </v-stage>

    <!-- 鼠标位置指示器 - 使用Vue组件方式 -->
    <div v-if="showMouseIndicator" class="mouse-position-indicator" :style="mouseIndicatorStyle">
      X: {{(viewState.mousePosition.x * props.unitRatio).toFixed(2)}}, 
      Y: {{(viewState.mousePosition.y * props.unitRatio).toFixed(2)}}
    </div>

    <!-- 状态显示面板 -->
    <div class="canvas-status-panel">
      <div class="status-item">
        <span>坐标范围:</span> 
        <span>X: {{viewportBounds.left.toFixed(2)}} 至 {{viewportBounds.right.toFixed(2)}}</span>
        <span>Y: {{viewportBounds.top.toFixed(2)}} 至 {{viewportBounds.bottom.toFixed(2)}}</span>
      </div>
      <div class="status-item">
        <span>缩放比例:</span> 
        <span>{{displayScale}}</span>
      </div>
    </div>

    <!-- 控制面板 -->
    <div class="canvas-controls">
      <button @click="resetView" title="重置视图">
        <i class="icon-reset"></i>
      </button>
      <button @click="zoomIn" title="放大">
        <i class="icon-zoom-in"></i>
      </button>
      <button @click="zoomOut" title="缩小">
        <i class="icon-zoom-out"></i>
      </button>
      <button @click="toggleDrawMode" :class="{ active: viewState.drawMode === 'line' }" title="绘制直线">
        <i class="icon-line"></i>
      </button>
      <button @click="exportCanvasAsImage" title="导出为图片">
        <i class="icon-export"></i>
      </button>
    </div>

    <!-- 绘制模式指示器 -->
    <div v-if="viewState.drawMode" class="draw-mode-indicator">
      当前模式: {{ drawModeText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, onUnmounted } from 'vue';
import { getViewportBounds, buildGrid } from './utils/canvasUtils.js';
import { drawGridWithThrottle } from './utils/gridUtils/index.js';

// 定义props
const props = defineProps({
  // 单位配置，例如 1单位 = 多少像素
  unitRatio: {
    type: Number,
    default: 1
  },
  // 初始缩放级别
  initialScale: {
    type: Number,
    default: 1
  },
  // 初始位置
  initialPosition: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  // 网格大小（单位）
  gridSize: {
    type: Number,
    default: 50
  },
  // 是否显示鼠标指示器
  showMouseIndicator: {
    type: Boolean,
    default: true
  },
  // 最大缩放级别 - 修改为接近JS数值上限
  maxScale: {
    type: Number,
    default: 1e15
  },
  // 最小缩放级别 - 修改为接近JS数值下限但保持正值
  minScale: {
    type: Number,
    default: 1e-15
  },
  // LOD配置
  lodThreshold: {
    type: Number,
    default: 5 // 元素小于这个像素值时隐藏
  },
  // 是否启用LOD
  enableLod: {
    type: Boolean,
    default: true
  },
  // 添加modelValue prop用于v-model绑定
  modelValue: {
    type: Array,
    default: () => []
  },
  // 允许的绘制元素类型
  allowedElementTypes: {
    type: Array,
    default: () => ['line', 'circle', 'rect', 'text', 'image', 'path']
  }
});

// 定义emit
const emit = defineEmits([
  'lod-update',
  'update:modelValue', // 添加v-model事件
  'element-added',
  'element-removed',
  'element-updated'
]);

// DOM和舞台引用
const canvasContainer = ref(null);
const stage = ref(null);
const backgroundLayer = ref(null);
const mainLayer = ref(null);
const uiLayer = ref(null);
const gridGroup = ref(null);

// 视图状态
const viewState = reactive({
  scale: props.initialScale,
  position: { ...props.initialPosition },
  width: 0,
  height: 0,
  isPanning: false,
  lastPointerPosition: null,
  mousePosition: { x: 0, y: 0 },
  mousePointerScreenPosition: null,
  initialized: false,
  elements: [],
  drawingElement: null, // 当前正在绘制的元素
  drawMode: null, // 当前绘制模式：null, 'line', 'circle', 'rect', 'text'等
  selectedElement: null, // 当前选中的元素
  lodLevel: 0, // 当前LOD级别
  visibleElements: new Set(), // 当前可见元素的ID集合
});

// 计算Stage配置
const stageConfig = computed(() => ({
  width: viewState.width,
  height: viewState.height,
  draggable: false, // 我们自己处理拖动
}));

// DOM层的样式，跟随画布变换
const domLayerStyle = computed(() => ({
  transform: `translate(${viewState.position.x}px, ${viewState.position.y}px) scale(${viewState.scale})`,
  transformOrigin: '0 0',
  position: 'absolute',
  width: '100%',
  height: '100%',
  pointerEvents: 'none', // 避免DOM层拦截鼠标事件
  zIndex: 1
}));

// 坐标轴配置 - 动态计算长度
const xAxisConfig = computed(() => {
  const bounds = getViewportBounds(viewState);
  return {
    points: [bounds.left, 0, bounds.right, 0], // 动态计算水平线长度
    stroke: 'red',
    strokeWidth: 1 / viewState.scale,
  };
});

const yAxisConfig = computed(() => {
  const bounds = getViewportBounds(viewState);
  return {
    points: [0, bounds.top, 0, bounds.bottom], // 动态计算垂直线长度
    stroke: 'green',
    strokeWidth: 1 / viewState.scale,
  };
});


// 鼠标指示器样式计算属性
const mouseIndicatorStyle = computed(() => {
  if (!viewState.mousePointerScreenPosition) {
    return { display: 'none' };
  }
  
  return {
    position: 'absolute',
    left: `${viewState.mousePointerScreenPosition.x}px`,
    top: `${viewState.mousePointerScreenPosition.y}px`,
    transform: 'translate(10px, -30px)'
  };
});

// 更新鼠标位置指示器
const updateMousePositionIndicator = (event) => {
  // 获取鼠标相对于canvas容器的坐标
  const rect = canvasContainer.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 更新鼠标屏幕位置状态
  viewState.mousePointerScreenPosition = { x, y };
};

// 替代原有的mousePositionText计算属性
const mousePositionText = computed(() => {
  // 返回空配置，我们将使用DOM元素显示文本
  return {
    text: '',
    visible: false
  };
});

// 鼠标指示线配置 - 保持不变
const mouseHorizontalLine = computed(() => {
  const bounds = getViewportBounds(viewState);
  return {
    points: [bounds.left, 0, bounds.right, 0],
    stroke: 'rgba(0, 0, 255, 0.5)',
    strokeWidth: 1 / viewState.scale,
    dash: [5 / viewState.scale, 5 / viewState.scale],
    y: viewState.mousePosition.y,
  };
});

const mouseVerticalLine = computed(() => {
  const bounds = getViewportBounds(viewState);
  return {
    points: [0, bounds.top, 0, bounds.bottom],
    stroke: 'rgba(0, 0, 255, 0.5)',
    strokeWidth: 1 / viewState.scale,
    dash: [5 / viewState.scale, 5 / viewState.scale],
    x: viewState.mousePosition.x,
  };
});

// 计算用于显示的视口边界
const viewportBounds = computed(() => {
  return getViewportBounds(viewState);
});

// 格式化缩放比例显示
const displayScale = computed(() => {
  // 如果比例过小或过大，使用科学计数法
  if (viewState.scale < 0.01 || viewState.scale > 100) {
    return viewState.scale.toExponential(2) + 'x';
  } 
  // 否则使用固定小数位显示
  return viewState.scale.toFixed(2) + 'x';
});

// 绘制模式显示文本
const drawModeText = computed(() => {
  switch(viewState.drawMode) {
    case 'line': return '绘制直线';
    default: return '浏览模式';
  }
});

// 优化后的网格绘制函数
const drawGrid = () => {
  if (!gridGroup.value || !gridGroup.value.getNode()) return;
  
  // 计算当前视口边界
  const bounds = getViewportBounds(viewState);
  bounds.width = viewState.width;  // 添加宽度和高度信息用于边界变化检测
  bounds.height = viewState.height;
  
  // 调用工具函数绘制网格，传入所需参数
  drawGridWithThrottle(
    gridGroup.value.getNode(),  // Konva网格组
    bounds,                     // 视口边界
    viewState.scale,            // 当前缩放比例
    props.gridSize,             // 网格大小配置
    props.unitRatio,            // 单位比例
    Konva,                      // Konva对象(用于创建元素)
    {
      // 可选配置，如自定义节流延迟等
      throttleDelay: 60
    }
  );
};

// 更新舞台变换时重新计算视口边界
const updateTransform = () => {
  if (!stage.value || !stage.value.getNode()) return;

  const konvaStage = stage.value.getNode();

  // 更新主要图层的变换
  const mainKonvaLayer = mainLayer.value.getNode();
  mainKonvaLayer.x(viewState.position.x);
  mainKonvaLayer.y(viewState.position.y);
  mainKonvaLayer.scale({ x: viewState.scale, y: viewState.scale });

  // 更新背景图层（网格）的变换
  const bgKonvaLayer = backgroundLayer.value.getNode();
  bgKonvaLayer.x(viewState.position.x);
  bgKonvaLayer.y(viewState.position.y);
  bgKonvaLayer.scale({ x: viewState.scale, y: viewState.scale });

  // UI层应用与其他层相同的变换，便于坐标一致性
  const uiKonvaLayer = uiLayer.value.getNode();
  uiKonvaLayer.x(viewState.position.x);
  uiKonvaLayer.y(viewState.position.y);
  uiKonvaLayer.scale({ x: viewState.scale, y: viewState.scale });

  // 更新LOD状态
  updateLodState();

  // 绘制所有图层
  konvaStage.batchDraw();

  // 更新网格以确保填满画布
  drawGrid()
};

// 获取相对于容器的鼠标位置
const getRelativePointerPosition = (event) => {
  if (!canvasContainer.value) return { x: 0, y: 0 };

  const rect = canvasContainer.value.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

// 获取鼠标的世界坐标位置 - 确保计算正确
const updateMouseWorldPosition = (event) => {
  const pointerPos = getRelativePointerPosition(event);

  // 转换为世界坐标 - 直接使用一致的公式
  viewState.mousePosition = {
    x: (pointerPos.x - viewState.position.x) / viewState.scale,
    y: (pointerPos.y - viewState.position.y) / viewState.scale,
  };

  // 确保UI层更新
  if (uiLayer.value && uiLayer.value.getNode()) {
    uiLayer.value.getNode().batchDraw();
  }
};

// 添加绘制相关的方法
// 切换绘制模式
const toggleDrawMode = () => {
  if (viewState.drawMode === 'line') {
    viewState.drawMode = null;
    document.body.style.cursor = 'default';
  } else {
    viewState.drawMode = 'line';
    document.body.style.cursor = 'crosshair';
  }
};

// 开始绘制线条
const startDrawingLine = (event) => {
  if (viewState.drawMode !== 'line') return;
  
  // 获取鼠标世界坐标
  const worldPos = screenToWorld(
    getRelativePointerPosition(event).x,
    getRelativePointerPosition(event).y
  );
  
  // 创建新的线条元素
  viewState.drawingElement = {
    id: 'line_' + Date.now(),
    type: 'line',
    points: [worldPos.x, worldPos.y, worldPos.x, worldPos.y],
    stroke: 'black',
    strokeWidth: 2 / viewState.scale,
    // 添加LOD属性
    lodRange: null
  };
  
  // 创建临时线条显示
  const konvaLine = new Konva.Line({
    points: viewState.drawingElement.points,
    stroke: viewState.drawingElement.stroke,
    strokeWidth: viewState.drawingElement.strokeWidth,
    id: viewState.drawingElement.id,
  });
  
  // 添加到主图层
  mainLayer.value.getNode().add(konvaLine);
  mainLayer.value.getNode().batchDraw();
};

// 正在绘制线条
const continueDrawingLine = (event) => {
  if (!viewState.drawingElement) return;
  
  // 获取鼠标世界坐标
  const worldPos = screenToWorld(
    getRelativePointerPosition(event).x,
    getRelativePointerPosition(event).y
  );
  
  // 更新线条终点坐标
  viewState.drawingElement.points[2] = worldPos.x;
  viewState.drawingElement.points[3] = worldPos.y;
  
  // 更新Konva线条
  const line = mainLayer.value.getNode().findOne('#' + viewState.drawingElement.id);
  if (line) {
    line.points(viewState.drawingElement.points);
    mainLayer.value.getNode().batchDraw();
  }
};

// 完成线条绘制
const finishDrawingLine = () => {
  if (!viewState.drawingElement) return;
  
  // 添加到元素数组
  addElement({...viewState.drawingElement});
  
  // 重置当前绘制元素
  viewState.drawingElement = null;
};

// 鼠标滚轮缩放 - 优化以处理极端缩放值
const handleWheel = (e) => {
  e.preventDefault();
  
  // 如果在绘制模式，不进行缩放
  if (viewState.drawMode) return;

  const oldScale = viewState.scale;

  // 获取鼠标位置相对于容器的坐标
  const pointer = getRelativePointerPosition(e);

  // 计算缩放因子 - 使用更小的缩放步长处理极端值
  let scaleBy;
  if (viewState.scale > 1e10 || viewState.scale < 1e-10) {
    scaleBy = e.deltaY < 0 ? 1.01 : 0.99; // 极端值时使用更小的缩放步长
  } else {
    scaleBy = e.deltaY < 0 ? 1.1 : 0.9;   // 正常缩放步长
  }

  let newScale = oldScale * scaleBy;

  // 约束缩放级别，确保不超过JS安全范围
  newScale = Math.max(props.minScale, Math.min(props.maxScale, newScale));

  // 安全检查：如果缩放无效或NaN，不进行缩放
  if (!isFinite(newScale) || isNaN(newScale)) {
    console.warn('缩放值无效:', newScale);
    return;
  }

  // 计算新的位置，使鼠标保持在同一个世界坐标点上
  viewState.position.x = pointer.x - (pointer.x - viewState.position.x) * (newScale / oldScale);
  viewState.position.y = pointer.y - (pointer.y - viewState.position.y) * (newScale / oldScale);
  viewState.scale = newScale;

  // 更新变换（内部会触发LOD更新）
  updateTransform()
};

// 开始平移
const startPan = (e) => {
  if (e.button !== 0) return; // 只响应左键拖动
  
  // 如果在绘制模式，不进行平移
  if (viewState.drawMode) return;

  viewState.isPanning = true;
  viewState.lastPointerPosition = getRelativePointerPosition(e);
  document.body.style.cursor = 'grabbing';

  updateTransform()
};

// 停止平移
const stopPan = () => {
  viewState.isPanning = false;
  viewState.lastPointerPosition = null;
  document.body.style.cursor = 'default';

  updateTransform()
};

// 鼠标移动处理
const onMouseMove = (event) => {
  // 如果正在平移，更新位置
  if (viewState.isPanning && viewState.lastPointerPosition) {
    const pointerPos = getRelativePointerPosition(event);

    // 计算自上次位置以来的移动距离
    const dx = pointerPos.x - viewState.lastPointerPosition.x;
    const dy = pointerPos.y - viewState.lastPointerPosition.y;

    // 应用移动
    viewState.position.x += dx;
    viewState.position.y += dy;

    // 保存当前位置用于下次计算
    viewState.lastPointerPosition = pointerPos;

    // 更新变换
    if (updateTransform) {
      updateTransform();
    }
  }

  // 如果在绘制线条模式
  if (viewState.drawMode === 'line' && viewState.drawingElement) {
    continueDrawingLine(event);
  }

  // 无论是否平移，都更新鼠标世界位置
  updateMouseWorldPosition(event);

  // 更新DOM指示器位置
  updateMousePositionIndicator(event);
};

// Konva舞台事件处理
const onStageMouseDown = (e) => {
  // 如果在绘制模式，开始绘制
  if (viewState.drawMode === 'line') {
    startDrawingLine(e.evt);
  }
};

const onStageMouseUp = (e) => {
  // 如果在绘制模式，完成绘制
  if (viewState.drawMode === 'line' && viewState.drawingElement) {
    finishDrawingLine();
  }
};

const onStageMouseMove = (e) => {
  // Konva特定事件处理
};

// 重置视图
const resetView = () => {
  viewState.scale = props.initialScale;
  viewState.position = { ...props.initialPosition };
  updateTransform()
  drawGrid();
};

// 放大
const zoomIn = () => {
  const newScale = Math.min(props.maxScale, viewState.scale * 1.2);
  const oldScale = viewState.scale;

  // 以中心点为基准缩放
  const centerX = viewState.width / 2;
  const centerY = viewState.height / 2;

  viewState.position.x = centerX - (centerX - viewState.position.x) * (newScale / oldScale);
  viewState.position.y = centerY - (centerY - viewState.position.y) * (newScale / oldScale);
  viewState.scale = newScale;

  updateTransform()
  drawGrid();
};

// 缩小
const zoomOut = () => {
  const newScale = Math.max(props.minScale, viewState.scale / 1.2);
  const oldScale = viewState.scale;

  // 以中心点为基准缩放
  const centerX = viewState.width / 2;
  const centerY = viewState.height / 2;

  viewState.position.x = centerX - (centerX - viewState.position.x) * (newScale / oldScale);
  viewState.position.y = centerY - (centerY - viewState.position.y) * (newScale / oldScale);
  viewState.scale = newScale;

  updateTransform()
  drawGrid();
};

// 导出画布为图片
const exportCanvasAsImage = (options = {}) => {
  const {
    pixelRatio = 2,
    mimeType = 'image/png',
    quality = 1
  } = options;

  if (!stage.value || !stage.value.getNode()) {
    console.error('无法导出：舞台不存在');
    return null;
  }

  try {
    const konvaStage = stage.value.getNode();
    
    // 获取当前视口的实际可见范围（世界坐标系）
    const bounds = getViewportBounds(viewState);
    
    // 计算当前视口可见范围在屏幕上的尺寸
    const visibleWidth = viewState.width;
    const visibleHeight = viewState.height;
    
    // 创建临时复制的舞台，以避免改变原始舞台的状态
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    // 创建临时舞台
    const tempStage = new Konva.Stage({
      container: tempContainer,
      width: visibleWidth * pixelRatio,
      height: visibleHeight * pixelRatio
    });
    
    // 创建背景层
    const tempBackgroundLayer = new Konva.Layer();
    tempStage.add(tempBackgroundLayer);
    
    // 添加白色背景矩形
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: visibleWidth * pixelRatio,
      height: visibleHeight * pixelRatio,
      fill: 'white'
    });
    tempBackgroundLayer.add(background);
    
    // 创建内容层
    const tempContentLayer = new Konva.Layer();
    tempStage.add(tempContentLayer);
    
    // 复制各层的内容
    const allLayers = [backgroundLayer.value, mainLayer.value, uiLayer.value];
    
    for (const layerRef of allLayers) {
      if (!layerRef || !layerRef.getNode()) continue;
      
      // 复制图层节点
      const originalLayer = layerRef.getNode();
      const children = originalLayer.getChildren();
      
      for (const child of children) {
        try {
          // 克隆节点
          const clone = child.clone();
          
          // 应用与原始舞台相同的变换
          // 但是考虑到临时舞台的坐标系与原始舞台不同，需要调整位置
          clone.x((clone.x() + viewState.position.x / viewState.scale) * pixelRatio);
          clone.y((clone.y() + viewState.position.y / viewState.scale) * pixelRatio);
          
          // 调整缩放比例
          clone.scaleX(clone.scaleX() * viewState.scale * pixelRatio);
          clone.scaleY(clone.scaleY() * viewState.scale * pixelRatio);
          
          tempContentLayer.add(clone);
        } catch (cloneError) {
          console.warn('克隆节点时出错:', cloneError);
        }
      }
    }
    
    // 绘制舞台
    tempStage.draw();
    
    // 使用toDataURL获取图像数据
    const dataURL = tempStage.toDataURL({
      mimeType,
      quality,
      pixelRatio: 1 // 已经应用了pixelRatio，不需要重复应用
    });
    
    // 清理临时元素
    tempStage.destroy();
    document.body.removeChild(tempContainer);
    
    return dataURL;
  } catch (error) {
    console.error('导出图片时出错:', error);
    
    // 极简备用方法
    try {
      // 直接尝试复制舞台的当前可见区域
      const canvas = document.createElement('canvas');
      canvas.width = viewState.width * pixelRatio;
      canvas.height = viewState.height * pixelRatio;
      const ctx = canvas.getContext('2d');
      
      // 获取Konva的原始canvas
      const konvaCanvas = stage.value.getNode().content.querySelector('canvas');
      if (konvaCanvas) {
        // 绘制白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 缩放以匹配像素比
        ctx.scale(pixelRatio, pixelRatio);
        
        // 复制舞台的内容
        ctx.drawImage(konvaCanvas, 0, 0);
        
        return canvas.toDataURL(mimeType, quality);
      }
    } catch (backupError) {
      console.error('备用导出方法也失败:', backupError);
    }
    
    return null;
  }
};

// 导出选定区域
const exportSelectedArea = (area, options = {}) => {
  return exportCanvasAsImage({
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    ...options
  });
};

// 窗口大小变化时调整舞台大小并居中原点
const handleResize = () => {
  if (!canvasContainer.value) return;

  const { width, height } = canvasContainer.value.getBoundingClientRect();
  viewState.width = width;
  viewState.height = height;

  // 初始化时居中原点
  if (!viewState.initialized) {
    // 设置位置使得原点(0,0)位于画布中心
    viewState.position.x = width / 2;
    viewState.position.y = height / 2;
    viewState.initialized = true;
  }

  updateTransform()

  drawGrid()
};

// 坐标转换方法
const worldToScreen = (worldX, worldY) => ({
  x: worldX * viewState.scale + viewState.position.x,
  y: worldY * viewState.scale + viewState.position.y
});

const screenToWorld = (screenX, screenY) => ({
  x: (screenX - viewState.position.x) / viewState.scale,
  y: (screenY - viewState.position.y) / viewState.scale
});

// 组件挂载和卸载
onMounted(() => {
  // 添加初始化标志
  viewState.initialized = false;

  // 调用handleResize进行初始化和居中
  handleResize();

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);

  // 初始化网格
  drawGrid();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// 监听属性变化
watch(() => props.gridSize, drawGrid);
watch(() => props.unitRatio, drawGrid);

// LOD处理相关函数
const calculateLodLevel = () => {
  // 根据当前缩放比例计算LOD级别
  // 缩放越小，LOD级别越高（显示越少细节）
  if (viewState.scale > 1) return 0;
  if (viewState.scale > 0.5) return 1;
  if (viewState.scale > 0.1) return 2;
  if (viewState.scale > 0.05) return 3;
  if (viewState.scale > 0.01) return 4;
  return 5;
};

// 检查元素是否应该显示（基于自动LOD或手动LOD）
const shouldElementBeVisible = (element) => {
  if (!props.enableLod) return true;
  
  // 如果元素有自定义LOD范围
  if (element.lodRange) {
    return viewState.scale >= element.lodRange.minScale && 
           viewState.scale <= element.lodRange.maxScale;
  }
  
  // 计算元素在屏幕上的大小
  const elementSize = calculateElementScreenSize(element);
  return elementSize >= props.lodThreshold;
};

// 计算元素在屏幕上的大小
const calculateElementScreenSize = (element) => {
  // 根据元素类型计算尺寸
  let size = 0;
  
  if (element.type === 'line') {
    // 线条同时考虑线宽和长度
    const strokeWidth = element.config.strokeWidth || 1;
    
    // 计算线条长度
    const points = element.config.points;
    let lineLength = 0;
    
    if (points && points.length >= 4) {
      // 对于多段线，计算所有线段长度总和
      for (let i = 0; i < points.length - 2; i += 2) {
        const dx = points[i+2] - points[i];
        const dy = points[i+3] - points[i+1];
        lineLength += Math.sqrt(dx*dx + dy*dy);
      }
    }
    
    // 线宽和长度都要乘以缩放比例转换为屏幕尺寸
    const widthSize = strokeWidth * viewState.scale;
    const lengthSize = lineLength * viewState.scale;
    
    // 取长度和宽度的最大值作为最终尺寸
    size = Math.max(widthSize, lengthSize);
  } else if (element.type === 'circle') {
    // 圆形使用半径作为尺寸基准
    size = (element.config.radius || 1) * viewState.scale;
  } else if (element.type === 'text') {
    // 文本使用字体大小作为尺寸基准
    size = (element.config.fontSize || 12) * viewState.scale;
  } else if (element.type === 'custom' && element.getScreenSize) {
    // 自定义元素可以提供计算方法
    size = element.getScreenSize(viewState.scale);
  } else {
    // 默认尺寸计算方法（宽高平均值）
    const width = element.config.width || element.width || 10;
    const height = element.config.height || element.height || 10;
    size = Math.max(width, height) * viewState.scale;
  }
  
  return size;
};

// 1. 首先定义创建Konva元素的工厂函数
const createKonvaElement = (element) => {
  if (!element || !element.type) return null;
  
  let konvaElement = null;
  
  switch (element.type) {
    case 'line':
      konvaElement = new Konva.Line({
        points: element.points || [],
        stroke: element.stroke || 'black',
        strokeWidth: element.strokeWidth || 2,
        id: element.id,
        draggable: element.draggable !== false,
        ...element.config
      });
      break;
    
    case 'circle':
      konvaElement = new Konva.Circle({
        x: element.x || 0,
        y: element.y || 0,
        radius: element.radius || 10,
        fill: element.fill || 'blue',
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        id: element.id,
        draggable: element.draggable !== false,
        ...element.config
      });
      break;
    
    case 'rect':
      konvaElement = new Konva.Rect({
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 20,
        height: element.height || 20,
        fill: element.fill || 'green',
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
        id: element.id,
        draggable: element.draggable !== false,
        ...element.config
      });
      break;
    
    case 'text':
      konvaElement = new Konva.Text({
        x: element.x || 0,
        y: element.y || 0,
        text: element.text || '',
        fontSize: element.fontSize || 16,
        fontFamily: element.fontFamily || 'Arial',
        fill: element.fill || 'black',
        id: element.id,
        draggable: element.draggable !== false,
        ...element.config
      });
      break;
      
    case 'image':
      // 为图片创建特殊处理
      if (element.imageUrl) {
        const imageObj = new Image();
        imageObj.onload = () => {
          konvaElement.image(imageObj);
          mainLayer.value.getNode().batchDraw();
        };
        imageObj.src = element.imageUrl;
        
        konvaElement = new Konva.Image({
          x: element.x || 0,
          y: element.y || 0,
          width: element.width,
          height: element.height,
          id: element.id,
          draggable: element.draggable !== false,
          ...element.config
        });
      }
      break;
      
    case 'path':
      konvaElement = new Konva.Path({
        data: element.data || '',
        fill: element.fill,
        stroke: element.stroke || 'black',
        strokeWidth: element.strokeWidth || 1,
        id: element.id,
        draggable: element.draggable !== false,
        ...element.config
      });
      break;
      
    case 'custom':
      // 支持自定义元素
      if (element.createFunction && typeof element.createFunction === 'function') {
        konvaElement = element.createFunction(Konva, element);
      }
      break;
      
    default:
      console.warn('不支持的元素类型:', element.type);
  }
  
  // 为元素添加事件处理
  if (konvaElement) {
    konvaElement.on('click', () => {
      selectElement(element);
    });
    
    konvaElement.on('dragend', () => {
      updateElementPosition(element.id, konvaElement);
    });
  }
  
  return konvaElement;
};

// 2. 选中元素函数
const selectElement = (element) => {
  viewState.selectedElement = element;
};

// 3. 更新元素位置函数
const updateElementPosition = (id, konvaNode) => {
  const elementIndex = viewState.elements.findIndex(el => el.id === id);
  if (elementIndex === -1) return;
  
  const element = viewState.elements[elementIndex];
  
  // 更新位置属性
  if (element.type === 'line') {
    element.points = konvaNode.points();
  } else {
    element.x = konvaNode.x();
    element.y = konvaNode.y();
  }
  
  // 更新内部状态并触发外部更新
  const newElements = [...viewState.elements];
  newElements[elementIndex] = element;
  viewState.elements = newElements;
  emit('update:modelValue', newElements);
  emit('element-updated', element);
};

// 4. 定义更新Konva元素函数
const updateKonvaElements = () => {
  if (!mainLayer.value || !mainLayer.value.getNode()) return;
  
  const layer = mainLayer.value.getNode();
  
  // 移除所有旧元素
  layer.getChildren().forEach(child => {
    if (child.attrs && child.attrs._isCanvasElement) {
      child.destroy();
    }
  });
  
  // 添加新元素
  viewState.elements.forEach(element => {
    const konvaElement = createKonvaElement(element);
    if (konvaElement) {
      konvaElement.setAttr('_isCanvasElement', true);
      layer.add(konvaElement);
    }
  });
  
  layer.batchDraw();
};

// 5. 现在可以安全地设置watch
watch(() => props.modelValue, (newValue) => {
  viewState.elements = JSON.parse(JSON.stringify(newValue));
  updateKonvaElements();
}, { deep: true, immediate: true });

// 添加元素
const addElement = (element) => {
  if (!element.id) {
    element.id = element.type + '_' + Date.now();
  }
  
  const newElements = [...viewState.elements, element];
  viewState.elements = newElements;
  
  // 更新v-model并通知父组件
  emit('update:modelValue', newElements);
  emit('element-added', element);
  
  // 更新Konva图层
  updateKonvaElements();
  updateLodState();
  
  return element;
};

// 移除元素
const removeElement = (elementId) => {
  const elementIndex = viewState.elements.findIndex(el => el.id === elementId);
  if (elementIndex === -1) return false;
  
  const element = viewState.elements[elementIndex];
  const newElements = viewState.elements.filter(el => el.id !== elementId);
  viewState.elements = newElements;
  
  // 更新v-model并通知父组件
  emit('update:modelValue', newElements);
  emit('element-removed', element);
  
  // 更新Konva图层
  updateKonvaElements();
  updateLodState();
  
  return true;
};

// 更新元素
const updateElement = (elementId, properties) => {
  const elementIndex = viewState.elements.findIndex(el => el.id === elementId);
  if (elementIndex === -1) return false;
  
  // 创建更新后的元素
  const updatedElement = {
    ...viewState.elements[elementIndex],
    ...properties
  };
  
  // 更新数组
  const newElements = [...viewState.elements];
  newElements[elementIndex] = updatedElement;
  viewState.elements = newElements;
  
  // 更新v-model并通知父组件
  emit('update:modelValue', newElements);
  emit('element-updated', updatedElement);
  
  // 更新Konva图层
  updateKonvaElements();
  updateLodState();
  
  return true;
};

// 更新LOD状态和可见性
const updateLodState = () => {
  if (!props.enableLod) return;
  
  // 更新当前LOD级别
  viewState.lodLevel = calculateLodLevel();
  
  // 更新元素可见性
  const newVisibleElements = new Set();
  
  // 处理所有绘制元素
  viewState.elements.forEach(element => {
    // 转换为LOD计算所需格式
    const elementForLod = {
      type: element.type,
      config: element
    };
    
    if (shouldElementBeVisible(elementForLod)) {
      newVisibleElements.add(element.id);
      
      // 更新Konva元素可见性
      const konvaElement = mainLayer.value?.getNode()?.findOne('#' + element.id);
      if (konvaElement) {
        konvaElement.visible(true);
      }
    } else {
      // 隐藏Konva元素
      const konvaElement = mainLayer.value?.getNode()?.findOne('#' + element.id);
      if (konvaElement) {
        konvaElement.visible(false);
      }
    }
  });
  
 // 更新可见元素集合
  viewState.visibleElements = newVisibleElements;
  
  // 重绘主图层
  if (mainLayer.value && mainLayer.value.getNode()) {
    mainLayer.value.getNode().batchDraw();
  }
  
  // 触发可见性变更事件
  emit('lod-update', {
    lodLevel: viewState.lodLevel,
    scale: viewState.scale,
    visibleElements: Array.from(viewState.visibleElements)
  });
};

// 向父组件暴露方法和变量
defineExpose({
  // refs
  canvasContainer,
  stage,
  backgroundLayer,
  mainLayer,
  uiLayer,
  gridGroup,

  // methods
  resetView,
  zoomIn,
  zoomOut,
  exportCanvasAsImage,
  exportSelectedArea,
  worldToScreen,
  screenToWorld,

  // 新增暴露属性和方法
  elements: viewState.elements,
  toggleDrawMode,

  // 添加元素操作API
  addElement,
  removeElement,
  updateElement,
  getElements: () => viewState.elements,
  getSelectedElement: () => viewState.selectedElement,
  
  // 绘制模式切换
  setDrawMode: (mode) => {
    if (!mode || props.allowedElementTypes.includes(mode)) {
      viewState.drawMode = mode;
      document.body.style.cursor = mode ? 'crosshair' : 'default';
    } else {
      console.warn('不支持的绘制模式:', mode);
    }
  },
  
  // LOD相关
  setElementLodRange: (elementId, minScale, maxScale) => {
    const element = viewState.elements.find(el => el.id === elementId);
    if (element) {
      updateElement(elementId, {
        lodRange: { minScale, maxScale }
      });
    }
  },
  
  // 设置全局LOD阈值
  setLodThreshold: (threshold) => {
    props.lodThreshold = threshold;
    updateLodState();
  }
});
</script>

<style scoped>
.infinite-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.canvas-status-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 12px;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.status-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.status-item > span:first-child {
  font-weight: bold;
  margin-bottom: 2px;
}

.canvas-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 10;
}

.canvas-controls button {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: white;
  border: 1px solid #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.canvas-controls button:hover {
  background: #f5f5f5;
}

/* 添加鼠标位置指示器样式 */
.mouse-position-indicator {
  background: white;
  border: 1px solid #ccc;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  color: #333;
}

/* 绘制模式按钮高亮样式 */
.canvas-controls button.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

/* 绘制模式指示器 */
.draw-mode-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(24, 144, 255, 0.9);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 20;
}
</style>
