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

      <!-- 主要内容层 -->
      <v-layer ref="mainLayer">
        <slot></slot>
      </v-layer>

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
// 导入全屏工具函数
import { 
  toggleFullscreen as toggleFullscreenUtil,
  isInFullscreenMode,
  addFullscreenChangeListener,
  removeFullscreenChangeListener
} from './utils/fullscreenUtils.js';
import { handlePanMovement, canPan } from './utils/panUtils.js';
import { exportCanvasAsImage as exportCanvasAsImageUtil, exportSelectedArea as exportSelectedAreaUtil } from './utils/exportUtils.js';

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
  },
  // 最大LOD级别
  maxLodLevel: {
    type: Number,
    default: 5
  },
  // 最小LOD级别
  minLodLevel: {
    type: Number,
    default: 0
  },
  // 最大平移距离（从原点算起）
  maxPanDistance: {
    type: Number,
    default: Infinity // 默认无限制
  },
  // 是否启用平移约束
  constrainPan: {
    type: Boolean,
    default: false
  },
  // 自定义按钮配置
  customButtons: {
    type: Array,
    default: () => [],
    // 每个按钮对象的结构：
    // {
    //   id: string,          // 按钮唯一标识
    //   icon: string,        // 按钮图标类名
    //   title: string,       // 按钮提示文本
    //   onClick: Function,   // 点击回调函数
    //   active: boolean,     // 是否激活状态（可选）
    //   position: 'start' | 'end' // 按钮位置，开始或结束（可选，默认end）
    // }
  }
});

// 定义emit
const emit = defineEmits([
  'lod-update',
  'update:modelValue', // 添加v-model事件
  'element-added',
  'element-removed',
  'element-updated',
  'mounted'
]);

// DOM和舞台引用
const canvasContainer = ref(null);
const stage = ref(null);
const backgroundLayer = ref(null);
const mainLayer = ref(null);
const uiLayer = ref(null);
const gridSystem = ref(null);

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
  // 添加FPS相关状态
  fps: 0,
  frameCount: 0,
  lastFpsUpdateTime: 0,
  showFps: true, // 是否显示FPS
  // 添加元素显隐统计
  elementStats: {
    total: 0,        // 总元素数量(不含系统元素)
    visible: 0,      // 可见元素数量
    hidden: 0,       // 隐藏元素数量
    hideReasons: {   // 隐藏原因统计
      lodScale: 0,   // 因LOD缩放级别隐藏
      lodRange: 0,   // 因自定义LOD范围隐藏
      manual: 0,     // 手动隐藏
      other: 0       // 其他原因
    }
  }
});

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

  // 网格系统无需额外调用，由组件内部监听处理
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
    cancelAnimationFrame(animationFrameId);
  }
});

// 监听属性变化
watch(() => props.gridSize, updateTransform);
watch(() => props.unitRatio, updateTransform);

// 1. 首先定义创建Konva元素的工厂函数
const createKonvaElement = (element) => {
  if (!element || !element.type) return null;

  let konvaElement = null;

  // 使用对象池缓存常用元素类型
  const elementPool = window._konvaElementPool = window._konvaElementPool || {
    line: [],
    circle: [],
    rect: [],
    text: []
  };

  const getFromPool = (type) => {
    const pool = elementPool[type];
    return pool && pool.length > 0 ? pool.pop() : null;
  };

  // 尝试从对象池获取元素
  konvaElement = getFromPool(element.type);

  if (!konvaElement) {
    // 如果对象池为空，则创建新元素
    switch (element.type) {
      case 'line':
        konvaElement = new Konva.Line({
          id: element.id,
          listening: false // 默认不监听事件，提高性能
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
  }

  // 更新元素配置
  if (konvaElement) {
    konvaElement.id(element.id);

    switch (element.type) {
      case 'line':
        konvaElement.points(element.points || []);
        konvaElement.stroke(element.stroke || 'black');
        konvaElement.strokeWidth(element.strokeWidth || 2);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'circle':
        konvaElement.x(element.x || 0);
        konvaElement.y(element.y || 0);
        konvaElement.radius(element.radius || 10);
        konvaElement.fill(element.fill || 'blue');
        konvaElement.stroke(element.stroke);
        konvaElement.strokeWidth(element.strokeWidth);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'rect':
        konvaElement.x(element.x || 0);
        konvaElement.y(element.y || 0);
        konvaElement.width(element.width || 20);
        konvaElement.height(element.height || 20);
        konvaElement.fill(element.fill || 'green');
        konvaElement.stroke(element.stroke);
        konvaElement.strokeWidth(element.strokeWidth);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'text':
        konvaElement.text(element.text || '');
        konvaElement.fontSize(element.fontSize || 16);
        konvaElement.fontFamily(element.fontFamily || 'Arial');
        konvaElement.fill(element.fill || 'black');
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'image':
        konvaElement.image(element.image);
        konvaElement.width(element.width);
        konvaElement.height(element.height);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'path':
        konvaElement.data(element.data || '');
        konvaElement.fill(element.fill);
        konvaElement.stroke(element.stroke || 'black');
        konvaElement.strokeWidth(element.strokeWidth || 1);
        konvaElement.draggable(element.draggable !== false);
        break;
      case 'custom':
        konvaElement.draggable(element.draggable !== false);
        break;
    }

    // 只为需要事件处理的元素添加事件
    if (element.needsEvents) {
      konvaElement.listening(true);
      // 添加事件监听
      konvaElement.off('click'); // 先移除旧事件
      konvaElement.on('click', () => {
        selectElement(element);
      });

      konvaElement.off('dragend');
      konvaElement.on('dragend', () => {
        updateElementPosition(element.id, konvaElement);
      });
    }
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
  layer.listening(false); // 暂时禁用事件监听

  // 创建当前元素ID的映射，用于快速查找
  const existingElements = new Map();
  layer.getChildren().forEach(child => {
    if (child.attrs && child.attrs._isCanvasElement && child.attrs.id) {
      existingElements.set(child.attrs.id, child);
    }
  });

  // 要添加的新元素
  const elementsToAdd = [];
  // 要更新的元素
  const elementsToUpdate = [];
  // 要保留的元素ID集合
  const elementIdsToKeep = new Set();

  // 分类处理元素
  viewState.elements.forEach(element => {
    if (!element.id) return;

    elementIdsToKeep.add(element.id);

    if (existingElements.has(element.id)) {
      // 现有元素，可能需要更新
      elementsToUpdate.push({ element, node: existingElements.get(element.id) });
    } else {
      // 新元素，需要添加
      elementsToAdd.push(element);
    }
  });

  // 删除不再需要的元素
  existingElements.forEach((node, id) => {
    if (!elementIdsToKeep.has(id)) {
      node.destroy();
    }
  });

  // 批量处理添加操作
  const processBatch = (elements, index = 0, batchSize = 200) => {
    const endIndex = Math.min(index + batchSize, elements.length);
    const currentBatch = elements.slice(index, endIndex);

    // 处理当前批次
    currentBatch.forEach(element => {
      const konvaElement = createKonvaElement(element);
      if (konvaElement) {
        konvaElement.setAttr('_isCanvasElement', true);
        layer.add(konvaElement);
      }
    });

    // 继续处理下一批或完成
    if (endIndex < elements.length) {
      requestAnimationFrame(() => processBatch(elements, endIndex, batchSize));
    } else {
      // 恢复事件监听并重绘
      layer.listening(true);
      layer.batchDraw();
      updateLodState();
    }
  };

  // 处理更新操作
  elementsToUpdate.forEach(({ element, node }) => {
    // 根据元素类型更新属性
    if (element.type === 'line' && element.points) {
      node.points(element.points);
    } else {
      // 更新常见属性
      if (element.x !== undefined) node.x(element.x);
      if (element.y !== undefined) node.y(element.y);
      if (element.fill !== undefined) node.fill(element.fill);
      if (element.stroke !== undefined) node.stroke(element.stroke);
      if (element.strokeWidth !== undefined) node.strokeWidth(element.strokeWidth);
      // 更新其他特定属性...
    }
  });

  // 开始批量添加新元素
  if (elementsToAdd.length > 0) {
    processBatch(elementsToAdd);
  } else {
    // 没有新元素时，直接恢复事件监听和重绘
    layer.listening(true);
    layer.batchDraw();
    updateLodState();
  }
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

// 添加批量高性能添加元素方法
const addElements = (elements) => {
  if (!Array.isArray(elements) || elements.length === 0) {
    return [];
  }

  // 批量处理：禁用自动重绘
  if (mainLayer.value && mainLayer.value.getNode()) {
    mainLayer.value.getNode().listening(false); // 暂时禁用事件监听以提高性能
  }

  // 为没有ID的元素生成ID
  const processedElements = elements.map(element => {
    if (!element.id) {
      return { ...element, id: element.type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) };
    }
    return element;
  });

  // 使用直接数组操作而不是创建新数组
  const originalLength = viewState.elements.length;
  viewState.elements.push(...processedElements);

  // 只触发一次更新事件
  emit('update:modelValue', viewState.elements);

  // 分批创建Konva元素以避免长时间阻塞UI
  const batchSize = 500; // 每批处理的元素数量
  const totalElements = processedElements.length;

  const processBatch = (startIndex) => {
    const endIndex = Math.min(startIndex + batchSize, totalElements);
    const currentBatch = processedElements.slice(startIndex, endIndex);

    // 批量添加Konva元素
    if (mainLayer.value && mainLayer.value.getNode()) {
      const layer = mainLayer.value.getNode();

      // 添加当前批次的元素
      currentBatch.forEach(element => {
        const konvaElement = createKonvaElement(element);
        if (konvaElement) {
          konvaElement.setAttr('_isCanvasElement', true);
          layer.add(konvaElement);
        }
      });

      // 处理下一批，或完成所有批次处理
      if (endIndex < totalElements) {
        // 使用requestAnimationFrame允许浏览器在批次之间更新UI
        requestAnimationFrame(() => processBatch(endIndex));
      } else {
        // 所有批次处理完成，恢复事件监听并重绘
        layer.listening(true);
        layer.batchDraw();
        updateLodState();

        // 单独触发每个元素的added事件（如果需要的话）
        processedElements.forEach(element => {
          emit('element-added', element);
        });
      }
    }
  };

  // 开始批处理
  if (totalElements > 0) {
    processBatch(0);
  }

  return processedElements;
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
  viewState.lodLevel = calculateLodLevel(viewState, props);

  // 更新元素可见性
  const newVisibleElements = new Set();

  // 重置统计信息
  viewState.elementStats = {
    total: 0,
    visible: 0,
    hidden: 0,
    hideReasons: {
      lodScale: 0,
      lodRange: 0,
      manual: 0,
      other: 0
    }
  };

  // 获取可见区域边界，用于视口剪裁
  const bounds = getViewportBounds(viewState);

  // 添加缓冲区以避免边缘抖动
  const bufferedBounds = {
    left: bounds.left - (bounds.right - bounds.left) * 0.1,
    right: bounds.right + (bounds.right - bounds.left) * 0.1,
    top: bounds.top - (bounds.bottom - bounds.top) * 0.1,
    bottom: bounds.bottom + (bounds.bottom - bounds.top) * 0.1
  };

  // 如果元素数量超过阈值，使用批处理
  const BATCH_THRESHOLD = 1000;
  const BATCH_SIZE = 500;

  if (viewState.elements.length > BATCH_THRESHOLD) {
    // 批量处理元素可见性
    const processLodBatch = (startIndex = 0) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, viewState.elements.length);
      const batchElements = viewState.elements.slice(startIndex, endIndex);

      // 处理当前批次
      batchElements.forEach(processElementVisibility);

      // 处理下一批或完成
      if (endIndex < viewState.elements.length) {
        setTimeout(() => processLodBatch(endIndex), 0);
      } else {
        // 完成所有批次处理
        updateVisibilityStatistics();
      }
    };

    // 开始批处理
    processLodBatch(0);
  } else {
    // 直接处理所有元素
    viewState.elements.forEach(processElementVisibility);
    updateVisibilityStatistics();
  }

  // 处理单个元素可见性的函数
  function processElementVisibility(element) {
    // 跳过系统元素
    if (element.isSystemElement || element.id?.startsWith('system_')) {
      return;
    }

    // 增加总元素计数
    viewState.elementStats.total++;

    // 转换为LOD计算所需格式
    const elementForLod = {
      type: element.type,
      config: element
    };

    // 获取元素中心点坐标
    let elementX = element.x || 0;
    let elementY = element.y || 0;

    // 线条元素需要特殊处理，使用点的平均值
    if (element.type === 'line' && element.points && element.points.length >= 4) {
      const points = element.points;
      let sumX = 0, sumY = 0, pointCount = 0;
      for (let i = 0; i < points.length; i += 2) {
        sumX += points[i];
        sumY += points[i + 1];
        pointCount++;
      }
      elementX = sumX / pointCount;
      elementY = sumY / pointCount;
    }

    // 视口剪裁 - 如果元素在可见区域外，直接隐藏
    const isInViewport = (
      elementX >= bufferedBounds.left &&
      elementX <= bufferedBounds.right &&
      elementY >= bufferedBounds.top &&
      elementY <= bufferedBounds.bottom
    );

    // 检查是否应该显示
    let visible = isInViewport; // 首先检查是否在视口内
    let hideReason = isInViewport ? null : 'outOfView';

    if (visible) { // 只有在视口内才进行其他检查
      // 检查手动隐藏
      if (element.visible === false) {
        visible = false;
        hideReason = 'manual';
      }
      // 检查LOD显隐
      else {
        // 获取可见性和透明度信息
        const visibilityResult = shouldElementBeVisible(elementForLod, viewState, props);
        
        if (!visibilityResult.visible) {
          visible = false;

          // 确定隐藏原因
          if (element.lodRange) {
            hideReason = 'lodRange';
          } else {
            // 基于元素屏幕尺寸的LOD
            hideReason = 'lodScale';
          }
        } else {
          // 元素可见，保存透明度信息供后续使用
          visible = true;
          element._lodOpacity = visibilityResult.opacity;
        }
      }
    }

    // 更新元素可见性
    if (visible) {
      newVisibleElements.add(element.id);
      viewState.elementStats.visible++;

      // 更新Konva元素可见性
      const konvaElement = mainLayer.value?.getNode()?.findOne('#' + element.id);
      if (konvaElement) {
        konvaElement.visible(true);
        // 设置透明度 - 使用LOD计算的透明度值
        if (element._lodOpacity !== undefined) {
          konvaElement.opacity(element._lodOpacity);
        }
      }
    } else {
      viewState.elementStats.hidden++;

      // 记录隐藏原因
      if (hideReason === 'lodRange') {
        viewState.elementStats.hideReasons.lodRange++;
      } else if (hideReason === 'lodScale') {
        viewState.elementStats.hideReasons.lodScale++;
      } else if (hideReason === 'manual') {
        viewState.elementStats.hideReasons.manual++;
      } else {
        viewState.elementStats.hideReasons.other++;
      }

      // 隐藏Konva元素 - 使用查找缓存提高性能
      const konvaElement = mainLayer.value?.getNode()?.findOne('#' + element.id);
      if (konvaElement) {
        konvaElement.visible(false);
      }
    }
  }

  // 更新可见性统计并触发事件
  function updateVisibilityStatistics() {
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
      visibleElements: Array.from(viewState.visibleElements),
      statistics: viewState.elementStats
    });
  }
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
