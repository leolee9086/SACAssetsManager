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
import { getViewportBounds, getOptimalLabelSpacing, getLODLevel, getLODGridSize } from './utils/canvasUtils.js';

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

// 创建一个鼠标位置指示器组件，确保偏移固定
const createMousePositionIndicator = () => {
  // 移除UI层上原有的指示器文本
  // 保留十字线，因为它们需要随画布缩放

  // 创建一个绝对定位的DOM元素作为鼠标指示器文本
  const indicatorContainer = document.createElement('div');
  indicatorContainer.className = 'mouse-position-indicator';
  indicatorContainer.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    transform: translate(10px, -30px);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    color: #333;
  `;

  canvasContainer.value.appendChild(indicatorContainer);

  return indicatorContainer;
};

// 更新鼠标位置指示器
const updateMousePositionIndicator = (event) => {
  if (!mouseIndicatorElement) return;

  // 获取鼠标相对于canvas容器的坐标
  const rect = canvasContainer.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // 将DOM元素放置在鼠标位置
  mouseIndicatorElement.style.left = `${x}px`;
  mouseIndicatorElement.style.top = `${y}px`;

  // 更新显示的世界坐标文本
  const worldX = (viewState.mousePosition.x * props.unitRatio).toFixed(2);
  const worldY = (viewState.mousePosition.y * props.unitRatio).toFixed(2);
  mouseIndicatorElement.textContent = `X: ${worldX}, Y: ${worldY}`;
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




// 格式化轴标签文本 - 增强处理极小/极大值
const formatAxisLabel = (value) => {
  // 非常小的值，使用科学计数法
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) {
    return value.toExponential(1);
  }
  // 大于1000使用k单位
  if (Math.abs(value) >= 1000 && Math.abs(value) < 1000000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  // 大于1M使用M单位
  if (Math.abs(value) >= 1000000 && Math.abs(value) < 1000000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  // 大于1G使用G单位
  if (Math.abs(value) >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'G';
  }
  // 一般情况
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // 小数保留合适精度
  const decimalPlaces = Math.min(2, Math.max(0, -Math.floor(Math.log10(Math.abs(value % 1)))));
  return value.toFixed(decimalPlaces);
};

// 提前声明更新函数
const drawGrid = ref(null);

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
  if (drawGrid.value) {
    drawGrid.value();
  }
};

// 绘制网格 - 增强处理极端缩放情况
drawGrid.value = () => {
  if (!gridGroup.value || !gridGroup.value.getNode()) return;

  const group = gridGroup.value.getNode();
  group.destroyChildren();

  // 计算当前视口边界
  const bounds = getViewportBounds(viewState);

  // 计算当前LOD级别和网格大小
  const lodLevel = getLODLevel(viewState);
  const mainGridSize = getLODGridSize(props.gridSize, viewState);

  // 计算次要网格尺寸（仅在中等级别显示）
  const showSecondaryGrid = lodLevel >= 2 && lodLevel <= 5;
  const secondaryGridSize = mainGridSize / 10;

  // 获取最佳标签间隔 - 动态计算
  const labelInterval = getOptimalLabelSpacing(viewState.scale);

  // 计算视口范围内的网格 - 扩大范围确保填满画布
  const startX = Math.floor(bounds.left / mainGridSize) * mainGridSize;
  const startY = Math.floor(bounds.top / mainGridSize) * mainGridSize;
  const endX = Math.ceil(bounds.right / mainGridSize) * mainGridSize;
  const endY = Math.ceil(bounds.bottom / mainGridSize) * mainGridSize;

  // 性能优化：限制网格线数量
  const maxGridLines = 1000;
  const estimatedHLines = Math.ceil((endY - startY) / mainGridSize);
  const estimatedVLines = Math.ceil((endX - startX) / mainGridSize);

  // 如果估计的网格线数量过多，调整网格大小
  if (estimatedHLines + estimatedVLines > maxGridLines) {
    // 递归调用，跳到更低精度的LOD级别
    return drawGrid.value();
  }

  // 绘制次要网格（较细的线）
  if (showSecondaryGrid) {
    const secStartX = Math.floor(bounds.left / secondaryGridSize) * secondaryGridSize;
    const secStartY = Math.floor(bounds.top / secondaryGridSize) * secondaryGridSize;
    const secEndX = Math.ceil(bounds.right / secondaryGridSize) * secondaryGridSize;
    const secEndY = Math.ceil(bounds.bottom / secondaryGridSize) * secondaryGridSize;

    // 在一定范围内绘制次要网格线
    for (let x = secStartX; x <= secEndX; x += secondaryGridSize) {
      // 如果是主网格线，跳过（稍后绘制）
      if (Math.abs(x % mainGridSize) < 0.000001) continue;

      const line = new Konva.Line({
        points: [x, bounds.top, x, bounds.bottom],
        stroke: '#eee',
        strokeWidth: 0.5 / viewState.scale,
      });
      group.add(line);
    }

    for (let y = secStartY; y <= secEndY; y += secondaryGridSize) {
      // 如果是主网格线，跳过（稍后绘制）
      if (Math.abs(y % mainGridSize) < 0.000001) continue;

      const line = new Konva.Line({
        points: [bounds.left, y, bounds.right, y],
        stroke: '#eee',
        strokeWidth: 0.5 / viewState.scale,
      });
      group.add(line);
    }
  }

  // 绘制主网格线
  for (let x = startX; x <= endX; x += mainGridSize) {
    const line = new Konva.Line({
      points: [x, bounds.top, x, bounds.bottom],
      stroke: x === 0 ? '#999' : '#ddd', // 原点线颜色加深
      strokeWidth: x === 0 ? 1.5 / viewState.scale : 1 / viewState.scale,
    });
    group.add(line);
  }

  for (let y = startY; y <= endY; y += mainGridSize) {
    const line = new Konva.Line({
      points: [bounds.left, y, bounds.right, y],
      stroke: y === 0 ? '#999' : '#ddd', // 原点线颜色加深
      strokeWidth: y === 0 ? 1.5 / viewState.scale : 1 / viewState.scale,
    });
    group.add(line);
  }

  // 根据最佳间隔绘制X轴坐标标签 - 改进浮点数比较
  const labelStartX = Math.floor(bounds.left / labelInterval) * labelInterval;
  const labelEndX = Math.ceil(bounds.right / labelInterval) * labelInterval;
  const EPSILON = 1e-10; // 浮点比较容差

  // 确保至少显示一些标签
  const maxLabels = 100; // 安全限制
  let labelCount = 0;

  for (let x = labelStartX; x <= labelEndX && labelCount < maxLabels; x += labelInterval) {
    // 跳过原点(0)，因为它用特殊标记
    if (Math.abs(x) < EPSILON) continue;

    labelCount++;
    const labelValue = x * props.unitRatio;
    const formattedLabel = formatAxisLabel(labelValue);

    const text = new Konva.Text({
      x: x,
      y: 5 / viewState.scale, // 固定距离X轴
      text: formattedLabel,
      fontSize: 12 / viewState.scale,
      fill: '#666',
      align: 'center',
      verticalAlign: 'top',
      offsetX: String(formattedLabel).length * 3 / viewState.scale, // 居中显示
    });
    group.add(text);

    // 添加小刻度线
    const tickLine = new Konva.Line({
      points: [x, 0, x, 3 / viewState.scale],
      stroke: '#666',
      strokeWidth: 1 / viewState.scale,
    });
    group.add(tickLine);
  }

  // 根据最佳间隔绘制Y轴坐标标签 - 同样改进浮点比较
  const labelStartY = Math.floor(bounds.top / labelInterval) * labelInterval;
  const labelEndY = Math.ceil(bounds.bottom / labelInterval) * labelInterval;

  labelCount = 0; // 重置计数
  for (let y = labelStartY; y <= labelEndY && labelCount < maxLabels; y += labelInterval) {
    // 跳过原点(0)，因为它用特殊标记
    if (Math.abs(y) < EPSILON) continue;

    labelCount++;
    const labelValue = y * props.unitRatio;
    const formattedLabel = formatAxisLabel(labelValue);

    const text = new Konva.Text({
      x: 5 / viewState.scale, // 固定距离Y轴
      y: y,
      text: formattedLabel,
      fontSize: 12 / viewState.scale,
      fill: '#666',
      align: 'left',
      verticalAlign: 'middle',
      offsetY: 6 / viewState.scale, // 轻微向上偏移
    });
    group.add(text);

    // 添加小刻度线
    const tickLine = new Konva.Line({
      points: [0, y, 3 / viewState.scale, y],
      stroke: '#666',
      strokeWidth: 1 / viewState.scale,
    });
    group.add(tickLine);
  }

  // 原点标记 - 用圆圈标记
  const originMark = new Konva.Circle({
    x: 0,
    y: 0,
    radius: 3 / viewState.scale,
    fill: 'red',
    stroke: 'white',
    strokeWidth: 1 / viewState.scale,
  });
  group.add(originMark);

  // 原点标签
  const originLabel = new Konva.Text({
    x: 5 / viewState.scale,
    y: 5 / viewState.scale,
    text: '(0,0)',
    fontSize: 12 / viewState.scale,
    fill: 'red',
    padding: 2,
  });
  group.add(originLabel);

  group.draw();
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
  drawGrid.value();
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
  drawGrid.value();
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
  drawGrid.value();
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

  if (drawGrid.value) {
    drawGrid.value();
  }
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
  drawGrid.value();

  // 创建鼠标位置指示器DOM元素
  mouseIndicatorElement = createMousePositionIndicator();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);

  // 移除鼠标位置指示器
  if (mouseIndicatorElement && mouseIndicatorElement.parentNode) {
    mouseIndicatorElement.parentNode.removeChild(mouseIndicatorElement);
  }
});

// 监听属性变化
watch(() => props.gridSize, drawGrid.value);
watch(() => props.unitRatio, drawGrid.value);

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
</style>
