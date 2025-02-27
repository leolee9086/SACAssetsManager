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
      <button @click="exportCanvasAsImage" title="导出为图片">
        <i class="icon-export"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, onUnmounted } from 'vue';
import { getViewportBounds, buildGrid } from './utils/canvasUtils.js';

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
  }
});

// 定义emit
const emit = defineEmits([]);

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
  initialized: false
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

// 鼠标位置文本DOM元素引用
let mouseIndicatorElement = null;

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

// 提前声明更新函数
const drawGrid = () => {
  if (!gridGroup.value || !gridGroup.value.getNode()) return;

  const group = gridGroup.value.getNode();
  group.destroyChildren();

  // 计算当前视口边界
  const bounds = getViewportBounds(viewState);

  // 使用纯函数构建网格元素
  const gridElements = buildGrid(bounds, viewState.scale, props.gridSize, props.unitRatio);

  // 如果返回null，表示需要调整网格尺寸后重试
  if (gridElements === null) {
    return drawGrid(); // 递归调用，会使用更低精度的LOD级别
  }

  // 创建并添加所有元素到网格组
  gridElements.forEach(element => {
    let node;
    switch (element.type) {
      case 'line':
        node = new Konva.Line(element.config);
        break;
      case 'text':
        node = new Konva.Text(element.config);
        break;
      case 'circle':
        node = new Konva.Circle(element.config);
        break;
      default:
        console.warn('未知的元素类型:', element.type);
        return;
    }
    group.add(node);
  });
  // 绘制网格组
  group.draw();
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

// 鼠标滚轮缩放 - 优化以处理极端缩放值
const handleWheel = (e) => {
  e.preventDefault();

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

  // 更新变换
  updateTransform()
};

// 开始平移
const startPan = (e) => {
  if (e.button !== 0) return; // 只响应左键拖动

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

  // 无论是否平移，都更新鼠标世界位置
  updateMouseWorldPosition(event);

  // 更新DOM指示器位置
  updateMousePositionIndicator(event);
};

// Konva舞台事件处理
const onStageMouseDown = (e) => {
  // Konva特定事件处理
};

const onStageMouseUp = (e) => {
  // Konva特定事件处理
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
    x = 0,
    y = 0,
    width = viewState.width / viewState.scale,
    height = viewState.height / viewState.scale,
    pixelRatio = 2,
    mimeType = 'image/png'
  } = options;

  // 创建一个临时舞台来渲染导出部分
  const tempStage = new Konva.Stage({
    container: document.createElement('div'),
    width: width,
    height: height,
  });

  // 复制背景层
  const tempBgLayer = new Konva.Layer();
  const bgClone = gridGroup.value.getNode().clone();
  bgClone.x(-x);
  bgClone.y(-y);
  tempBgLayer.add(bgClone);

  // 复制主内容层
  const tempMainLayer = new Konva.Layer();
  const mainClone = mainLayer.value.getNode().clone();
  mainClone.x(-x);
  mainClone.y(-y);
  tempMainLayer.add(mainClone);

  // 添加图层到临时舞台
  tempStage.add(tempBgLayer);
  tempStage.add(tempMainLayer);

  // 导出为图片
  const dataURL = tempStage.toDataURL({
    pixelRatio: pixelRatio,
    mimeType: mimeType,
  });

  // 销毁临时舞台
  tempStage.destroy();

  return dataURL;
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
  screenToWorld
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
</style>
