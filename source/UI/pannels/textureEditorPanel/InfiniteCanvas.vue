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
        <!-- 使用新的网格系统组件 -->
        <grid-system 
          ref="gridSystem"
          :viewport="viewportBounds"
          :scale="viewState.scale"
          :gridSize="props.gridSize"
          :unitRatio="props.unitRatio"
          :theme="gridTheme"
          :throttleDelay="60"
          :visible="true"
        />
      </v-layer>

      <!-- 主要内容层 - 使用拆分后的组件，但现在传递已经过滤好的可见元素 -->
      <main-layer
        ref="mainLayer"
        :elements="visibleElements"
        :drawingElement="viewState.drawingElement"
        :scale="viewState.scale"
        :viewport="viewportBounds"
        :viewState="viewState"
        @element-updated="handleElementUpdate"
        @element-selected="selectElement"
      >
        <!-- 传递自定义内容 -->
        <slot></slot>
      </main-layer>

      <!-- UI层（坐标轴、鼠标指示器等） -->
      <v-layer ref="uiLayer">
        <!-- 使用新的坐标轴系统组件 -->
        <axis-system 
          :viewport="viewportBounds"
          :scale="viewState.scale"
          :xAxisColor="'red'"
          :yAxisColor="'green'"
          :strokeWidth="1"
          :visible="true"
        />

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
      X: {{ (viewState.mousePosition.x * props.unitRatio).toFixed(2) }},
      Y: {{ (viewState.mousePosition.y * props.unitRatio).toFixed(2) }}
    </div>

    <!-- 状态显示面板 -->
    <canvas-status-panel
      :viewportBounds="viewportBounds"
      :scale="viewState.scale"
      :lodLevel="viewState.lodLevel"
      :constrainPan="props.constrainPan"
      :distanceFromOrigin="distanceFromOrigin"
      :maxPanDistance="props.maxPanDistance"
      :fps="viewState.fps"
      :showFps="viewState.showFps"
      position="top-left"
    >
      <!-- 可以添加自定义状态项 -->
    </canvas-status-panel>

    <!-- 控制面板 -->
    <div class="canvas-controls">
      <!-- 添加前置自定义按钮 -->
      <template v-for="button in customButtons.filter(b => b.position === 'start')" :key="button.id">
        <button @click="button.onClick" :title="button.title" :class="{ active: button.active }">
          <i :class="button.icon"></i>
        </button>
      </template>

      <!-- 原有的默认按钮 -->
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
      <!-- 添加全屏按钮 -->
      <button @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
        <i :class="isFullscreen ? 'icon-fullscreen-exit' : 'icon-fullscreen'"></i>
      </button>

      <!-- 添加后置自定义按钮 -->
      <template v-for="button in customButtons.filter(b => b.position !== 'start')" :key="button.id">
        <button @click="button.onClick" :title="button.title" :class="{ active: button.active }">
          <i :class="button.icon"></i>
        </button>
      </template>
    </div>

    <!-- 绘制模式指示器 -->
    <div v-if="viewState.drawMode" class="draw-mode-indicator">
      当前模式: {{ drawModeText }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, onUnmounted } from 'vue';
import { getViewportBounds, calculateLodLevel } from './utils/canvasUtils.js';
import { shouldElementBeVisible } from './utils/LODUtils/index.js';
import GridSystem from './components/GridSystem.vue';
import CanvasStatusPanel from './components/CanvasStatusPanel.vue';
import AxisSystem from './components/AxisSystem.vue';
import MainLayer from './components/MainLayer.vue'; // 导入新组件
import { 
  toggleFullscreen as toggleFullscreenUtil,
  isInFullscreenMode,
  addFullscreenChangeListener,
  removeFullscreenChangeListener
} from './utils/fullscreenUtils.js';
import { handlePanMovement, canPan } from './utils/panUtils.js';
import { exportCanvasAsImage as exportCanvasAsImageUtil, exportSelectedArea as exportSelectedAreaUtil } from './utils/exportUtils.js';
import { canvasProps } from './utils/canvasProps.js'; // 导入Props定义
import { 创建响应式视图状态,更新元素统计信息 } from './composables/useViewState.js';
// 定义props
const props = defineProps(canvasProps);

// 定义emit
const emit = defineEmits([
  'lod-update',
  'update:modelValue', // 添加v-model事件
  'element-added',
  'element-removed',
  'element-updated',
  'mounted',
  'element-selected',
  'elements-cleared'
]);

// DOM和舞台引用
const canvasContainer = ref(null);
const stage = ref(null);
const backgroundLayer = ref(null);
const mainLayer = ref(null);
const uiLayer = ref(null);
const gridSystem = ref(null);

// 视图状态
const viewState = 创建响应式视图状态({ canvasProps: props, reactive });

// 添加全屏状态
const isFullscreen = ref(false);

// 切换全屏方法
const toggleFullscreen = async () => {
  await toggleFullscreenUtil(canvasContainer.value);
};

// 监听全屏状态变化
const handleFullscreenChange = () => {
  isFullscreen.value = isInFullscreenMode();

  // 全屏状态变化后重新计算画布尺寸
  handleResize();
};

// 组件挂载时添加全屏事件监听
onMounted(() => {
  addFullscreenChangeListener(handleFullscreenChange);
  
  // 添加挂载完成事件
  emit('mounted');
});

// 组件卸载时移除全屏事件监听
onUnmounted(() => {
  removeFullscreenChangeListener(handleFullscreenChange);
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

// 计算与原点的距离
const distanceFromOrigin = computed(() => {
  // 计算当前视图位置的原点(0,0)距离屏幕中心的距离
  const screenCenterX = viewState.width / 2;
  const screenCenterY = viewState.height / 2;

  // 原点在屏幕上的位置
  const originOnScreenX = viewState.position.x;
  const originOnScreenY = viewState.position.y;

  // 计算距离
  const dx = originOnScreenX - screenCenterX;
  const dy = originOnScreenY - screenCenterY;

  return Math.sqrt(dx * dx + dy * dy);
});

// 绘制模式显示文本
const drawModeText = computed(() => {
  switch (viewState.drawMode) {
    case 'line': return '绘制直线';
    default: return '浏览模式';
  }
});

// 添加网格主题配置
const gridTheme = reactive({
  primaryColor: 'rgba(200, 200, 200, 0.2)',
  secondaryColor: 'rgba(200, 200, 200, 0.1)',
  tertiaryColor: 'rgba(200, 200, 200, 0.05)',
  axisXColor: 'rgba(255, 0, 0, 0.5)',
  axisYColor: 'rgba(0, 128, 0, 0.5)',
  lineWidth: 1
});

// 更新舞台变换时重新计算视口边界
const updateTransform = () => {
  if (!stage.value || !stage.value.getNode()) return;

  const konvaStage = stage.value.getNode();

  // 更新主要图层的变换
  const mainKonvaLayer = mainLayer.value.getLayer();
  if (mainKonvaLayer) {
    mainKonvaLayer.x(viewState.position.x);
    mainKonvaLayer.y(viewState.position.y);
    mainKonvaLayer.scale({ x: viewState.scale, y: viewState.scale });
  }

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
  mainLayer.value.getLayer().add(konvaLine);
  mainLayer.value.getLayer().batchDraw();
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
  const line = mainLayer.value.getLayer().findOne('#' + viewState.drawingElement.id);
  if (line) {
    line.points(viewState.drawingElement.points);
    mainLayer.value.getLayer().batchDraw();
  }
};

// 完成线条绘制
const finishDrawingLine = () => {
  if (!viewState.drawingElement) return;

  // 添加到元素数组
  addElement({ ...viewState.drawingElement });

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

  // 计算缩放因子 - 自适应缩放步长
  let scaleBy;

  // 极端缩放值时使用更小的缩放步长
  if (Math.abs(oldScale) < 1e-10) {
    // 非常小的值时
    scaleBy = e.deltaY < 0 ? 1.01 : 0.99;
  } else if (Math.abs(oldScale) > 1e10) {
    // 非常大的值时
    scaleBy = e.deltaY < 0 ? 1.01 : 0.99;
  } else if (oldScale < 0.1) {
    // 较小值时
    scaleBy = e.deltaY < 0 ? 1.05 : 0.95;
  } else if (oldScale > 10) {
    // 较大值时
    scaleBy = e.deltaY < 0 ? 1.05 : 0.95;
  } else {
    // 正常缩放范围
    scaleBy = e.deltaY < 0 ? 1.1 : 0.9;
  }

  let newScale = oldScale * scaleBy;

  // 约束缩放级别，确保不超过设置的限制
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
  updateTransform();
};

// 开始平移
const startPan = (e) => {
  if (e.button !== 1) return; // 只响应中键拖动

  // 阻止事件冒泡和默认行为
  e.preventDefault();
  e.stopPropagation();

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

// 处理平移逻辑
const handlePanning = (event) => {
  if (!canPan(viewState, event)) return;
  
  const pointerPos = getRelativePointerPosition(event);
  
  // 使用工具函数处理平移
  const newPosition = handlePanMovement(viewState, pointerPos, {
    constrainPan: props.constrainPan,
    maxPanDistance: props.maxPanDistance
  });
  
  // 更新位置
  viewState.position.x = newPosition.x;
  viewState.position.y = newPosition.y;
  
  // 保存当前位置用于下次计算
  viewState.lastPointerPosition = pointerPos;
  
  // 更新变换
  updateTransform();
};

// 处理绘制逻辑
const handleDrawing = (event) => {
  if (viewState.drawMode === 'line' && viewState.drawingElement) {
    continueDrawingLine(event);
  }
};

// 更新鼠标状态
const updateMouseState = (event) => {
  // 更新鼠标世界位置
  updateMouseWorldPosition(event);
  // 更新DOM指示器位置
  updateMousePositionIndicator(event);
};

// 鼠标移动处理 - 重构后的方法
const onMouseMove = (event) => {
  // 处理平移
  handlePanning(event);
  // 处理绘制
  handleDrawing(event);
  // 更新鼠标状态
  updateMouseState(event);
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
  updateTransform();
  // 无需手动调用drawGrid
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

  updateTransform();
  // 无需手动调用drawGrid
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

  updateTransform();
  // 无需手动调用drawGrid
};

// 将导出画布为图片的方法替换为使用工具函数
const exportCanvasAsImage = (options = {}) => {
  // 准备图层引用
  const layerRefs = {
    backgroundLayer: backgroundLayer.value,
    mainLayer: mainLayer.value,
    uiLayer: uiLayer.value
  };
  
  return exportCanvasAsImageUtil(options, stage.value, layerRefs, viewState);
};

// 导出选定区域
const exportSelectedArea = (area, options = {}) => {
  // 准备图层引用
  const layerRefs = {
    backgroundLayer: backgroundLayer.value,
    mainLayer: mainLayer.value,
    uiLayer: uiLayer.value
  };
  
  return exportSelectedAreaUtil(area, options, stage.value, layerRefs, viewState);
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

// 添加FPS计算和更新函数
let animationFrameId = null;

const updateFps = () => {
  const now = performance.now();
  viewState.frameCount++;

  // 每秒更新一次FPS值
  if (now - viewState.lastFpsUpdateTime >= 1000) {
    viewState.fps = Math.round(viewState.frameCount * 1000 / (now - viewState.lastFpsUpdateTime));
    viewState.frameCount = 0;
    viewState.lastFpsUpdateTime = now;
  }

  // 保持循环
  animationFrameId = requestAnimationFrame(updateFps);
};

// 组件挂载和卸载
onMounted(() => {
  // 添加初始化标志
  viewState.initialized = false;

  // 调用handleResize进行初始化和居中
  handleResize();

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);

  // 初始化网格
  updateTransform();

  // 启动FPS计算
  viewState.lastFpsUpdateTime = performance.now();
  viewState.frameCount = 0;
  updateFps();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);

  // 停止FPS计算
  if (animationFrameId) {
    cancelAnimationFrame(animationId);
  }
});

// 监听属性变化
watch(() => props.gridSize, updateTransform);
watch(() => props.unitRatio, updateTransform);

// 处理元素更新
const handleElementUpdate = (element) => {
  const elementIndex = viewState.elements.findIndex(el => el.id === element.id);
  if (elementIndex !== -1) {
    const newElements = [...viewState.elements];
    newElements[elementIndex] = {...element};
    viewState.elements = newElements;
    emit('update:modelValue', newElements);
    emit('element-updated', element);
  }
};

// 选择元素
const selectElement = (element) => {
  viewState.selectedElement = element;
  emit('element-selected', element);
};

// 更新元素统计信息
const updateElementStats = (stats) => {
  viewState.elementStats = stats;
  
  // 触发LOD更新事件
  emit('lod-update', {
    lodLevel: viewState.lodLevel,
    scale: viewState.scale,
    visibleElements: stats.visibleElementIds || [], // 使用stats中传递的可见元素ID列表
    statistics: viewState.elementStats
  });
};

// 更新LOD状态
const updateLodState = () => {
  if (props.enableLod) {
    // 基于当前缩放计算LOD级别
    viewState.lodLevel = calculateLodLevel({
      scale: viewState.scale
    }, {
      minLodLevel: props.minLodLevel,
      maxLodLevel: props.maxLodLevel,
      useLodLog: props.useLodLog
    });
  }
};

// 添加元素函数
const addElement = (element) => {
  if (!element.id) {
    // 使用时间戳 + 随机字符串确保ID唯一
    element.id = element.type + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  const newElements = [...viewState.elements, element];
  viewState.elements = newElements;

  // 更新v-model并通知父组件
  emit('update:modelValue', newElements);
  emit('element-added', element);
  
  // 添加元素后更新LOD状态
  updateLodState();

  return element;
};

// 添加批量元素函数
const addElements = (elements) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return [];
  }
  
  // 为没有ID的元素添加ID
  const processedElements = elements.map(element => {
    if (!element.id) {
      // 确保每个ID都是唯一的
      element.id = element.type + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    return element;
  });
  
  // 添加到现有元素数组
  const newElements = [...viewState.elements, ...processedElements];
  viewState.elements = newElements;
  
  // 更新v-model并通知父组件
  emit('update:modelValue', newElements);
  
  // 对每个元素触发element-added事件
  processedElements.forEach(element => {
    emit('element-added', element);
  });
  
  // 更新LOD状态
  updateLodState();
  
  return processedElements;
};

// 移除元素函数
const removeElement = (elementId) => {
  const elementIndex = viewState.elements.findIndex(el => el.id === elementId);
  if (elementIndex === -1) return false;

  const element = viewState.elements[elementIndex];
  const newElements = viewState.elements.filter(el => el.id !== elementId);
  viewState.elements = newElements;

  // 更新v-model并通知父组件
  emit('update:modelValue', newElements);
  emit('element-removed', element);
  
  // 移除元素后更新LOD状态
  updateLodState();

  return true;
};

// 更新元素函数
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
  
  return true;
};

// 向父组件暴露方法和变量
defineExpose({
  // refs
  canvasContainer,
  stage,
  backgroundLayer,
  mainLayer,
  uiLayer,
  gridSystem,

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
  addElements,
  removeElement,
  updateElement,
  getElements: () => viewState.elements,
  getSelectedElement: () => viewState.selectedElement,
  
  // 添加清除所有元素的方法
  clearElements: () => {
    // 保存当前元素数组的引用，用于触发事件
    const oldElements = [...viewState.elements];
    // 清空元素数组
    viewState.elements = [];
    // 更新v-model
    emit('update:modelValue', []);
    // 发出所有元素被移除的事件
    emit('elements-cleared', oldElements);
    // 返回被清除的元素数量
    return oldElements.length;
  },

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
  },

  // 启用或禁用LOD
  setEnableLod: (enable) => {
    props.enableLod = enable;
    updateLodState();
  },

  // 添加LOD和平移约束相关方法
  setMaxLodLevel: (level) => {
    props.maxLodLevel = level;
    updateLodState();
  },
  setMinLodLevel: (level) => {
    props.minLodLevel = level;
    updateLodState();
  },
  setMaxPanDistance: (distance) => {
    props.maxPanDistance = distance;
  },
  setConstrainPan: (constrain) => {
    props.constrainPan = constrain;
  },
  getDistanceFromOrigin: () => distanceFromOrigin.value,

  // 添加FPS相关控制
  setShowFps: (show) => {
    viewState.showFps = show;
  },

  getFps: () => viewState.fps,

  // 获取元素统计信息
  getElementStatistics: () => viewState.elementStats,

  // 标记元素为系统元素(不计入统计)
  markAsSystemElement: (elementId, isSystem = true) => {
    const element = viewState.elements.find(el => el.id === elementId);
    if (element) {
      updateElement(elementId, {
        isSystemElement: isSystem
      });
    }
  },

  // 手动隐藏/显示元素
  setElementVisibility: (elementId, visible) => {
    const element = viewState.elements.find(el => el.id === elementId);
    if (element) {
      updateElement(elementId, {
        visible: visible
      });
    }
  },

  gridSystem: computed(() => gridSystem.value), // 暴露网格系统组件
  setGridTheme: (theme) => {
    Object.assign(gridTheme, theme);
  },
});

// 计算哪些元素应该可见
const visibleElements = computed(() => {
  // 重置所有元素的LOD隐藏状态
  const elements = viewState.elements || [];
  elements.forEach(element => {
    // 重要：在每次计算前，移除之前的LOD隐藏标记
    element._hiddenByLod = false;
  });

  const filteredElements = elements.filter(element => {
    // 检查元素是否被手动隐藏
    if (element.manuallyHidden === true) return false;
    
    // 如果是系统元素，总是显示
    if (element.isSystemElement) return true;
    
    // 应用LOD规则
    if (props.enableLod) {
      // 检查自定义LOD范围
      if (element.lodRange) {
        const { minScale, maxScale } = element.lodRange;
        if ((minScale !== undefined && viewState.scale < minScale) || 
            (maxScale !== undefined && viewState.scale > maxScale)) {
          element._hiddenByLod = true;
          return false;
        }
      }
      
      // 检查元素是否足够大以显示
      const visibility = shouldElementBeVisible(element, viewState, props);
      console.log(visibility)
      // 关键：只依赖当前计算结果
      if (!visibility.visible) {
        element._hiddenByLod = true;
        return false;
      }
      
      // 更新元素的不透明度
      element.opacity = visibility.opacity;
    }
    
    // 处理图像特殊情况
    if (element.type === 'image' && !element.imageReady && element.imageUrl) {
      // 如果图像未加载，先加载图像
      loadImage(element);
      return false;
    }
    
    return true;
  });
  
  // 更新元素统计信息
  updateElementStatistics(filteredElements);
  
  return filteredElements;
});

// 图像加载函数 - 从MainLayer移到这里
const loadImage = (element) => {
  if (!element.imageUrl || element.imageLoading) return;
  
  element.imageLoading = true;
  const imageObj = new Image();
  
  imageObj.onload = () => {
    element.image = imageObj;
    element.imageReady = true;
    element.imageLoading = false;
  };
  
  imageObj.onerror = () => {
    element.imageLoading = false;
    console.error('无法加载图像:', element.imageUrl);
  };
  
  imageObj.src = element.imageUrl;
};

// 更新元素统计信息
const updateElementStatistics = (visibleList) => {
  // 调用更新元素统计信息函数
  const stats = 更新元素统计信息({
    viewState: viewState,
    visibleList: visibleList,
    enableLod: props.enableLod
  });
  
  // 更新状态
  viewState.elementStats = stats;
};
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
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

/* 为显隐统计添加样式 */
.hidden-details {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

/* 全屏按钮样式 */
.canvas-controls button i.icon-fullscreen,
.canvas-controls button i.icon-fullscreen-exit {
  font-style: normal;
  font-size: 18px;
  line-height: 1;
}

/* 全屏时的样式 */
.infinite-canvas-container:fullscreen {
  width: 100vw;
  height: 100vh;
  background: white;
}

/* 添加自定义按钮相关样式 */
.canvas-controls button.custom-button {
  /* 继承现有按钮样式 */
}

.canvas-controls button.custom-button.active {
  background: #e6f7ff;
  border-color: #1890ff;
}
</style>
