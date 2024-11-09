<template>
  <div ref="connectionCanvas" class="connection-canvas">
    <div id="connection-canvas-container" class="canvas-container">
      <v-stage
        v-if="stageConfig"
        ref="stage"
        :config="stageConfig"
        @mousedown="handleStageMouseDown"
        @mousemove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
      >
        <!-- 网格图层 -->
        <v-layer 
          ref="gridLayer"
          :config="{
            width: stageConfig.width,
            height: stageConfig.height
          }"
        >
          <v-line
            v-for="line in gridLines"
            :key="line.id"
            :config="line"
          />
          <v-text
            v-for="label in gridLabels"
            :key="label.id"
            :config="label"
          />
        </v-layer>

        <!-- 标尺图层 -->
        <v-layer 
          ref="rulerLayer"
          :config="{
            width: stageConfig.width,
            height: stageConfig.height
          }"
        >
          <v-rect :config="horizontalRulerConfig" />
          <v-rect :config="verticalRulerConfig" />
          <v-line
            v-for="tick in rulerTicks"
            :key="tick.id"
            :config="tick"
          />
          <v-text
            v-for="label in rulerLabels"
            :key="label.id"
            :config="label"
          />
        </v-layer>

        <!-- 连接线图层 -->
        <v-layer 
          ref="connectionLayer"
          :config="{
            width: stageConfig.width,
            height: stageConfig.height
          }"
        >
          <template v-for="connection in connections" :key="connection.id">
            <v-line
              :config="{
                points: connection.points,
                stroke: connection.stroke,
                strokeWidth: connection.strokeWidth,
                lineCap: connection.lineCap,
                lineJoin: connection.lineJoin,
                tension: connection.tension
              }"
            />
            <v-arrow
              v-if="connection.arrowConfig"
              :config="connection.arrowConfig"
            />
            <v-circle
              v-if="connection.dotConfig"
              :config="connection.dotConfig"
            />
          </template>
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch,inject,toRef,nextTick   } from 'vue';

import { drawConnection } from './geometry/BezierConnectionDrawer.js';

const props = defineProps({
  cards: {
    type: Array,
    required: true
  },
  connections: {
    type: Array,
    required: true
  },
  connectionStyle: {
    type: Object,
    default: () => ({
      geometry: 'circuit',
      drawingStyle: 'normal'
    })
  },
  coordinateManager:{
    type: Object,
    required: true

  },
  gridConfig: {
    type: Object,
    default: () => ({
      enabled: true,
      size: 20,
      color: '#E5E5E5',
      showCoordinates: true
    })
  }
});

// 状态管理
const connectionCanvas = ref(null);
const stage = ref(null);
const connections = ref([]);
const previewConnection = ref(null);
const currentConnection = ref(null);

// Stage配置
const stageConfig = computed(() => {
  if (!connectionCanvas.value) return null;
  
  const parentSize = props.coordinateManager.getParentSize();
  return {
    width: parentSize.width,
    height: parentSize.height,
    container: 'connection-canvas-container'
  };
});

// 网格线配置
const gridLines = computed(() => {
  if (!props.gridConfig.enabled) return [];
  
  const parentSize = props.coordinateManager.getParentSize();
  const gridSize = props.gridConfig.size;
  const scroll = props.coordinateManager.getScrollOffset();
  const lines = [];
  
  // 计算网格范围
  const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
  const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
  const endX = startX + parentSize.width + gridSize;
  const endY = startY + parentSize.height + gridSize;
  
  // 垂直线
  for (let x = startX; x <= endX; x += gridSize) {
    lines.push({
      id: `v-${x}`,
      points: [x, startY, x, endY],
      stroke: props.gridConfig.color,
      strokeWidth: 1,
      opacity: 0.5
    });
  }
  
  // 水平线
  for (let y = startY; y <= endY; y += gridSize) {
    lines.push({
      id: `h-${y}`,
      points: [startX, y, endX, y],
      stroke: props.gridConfig.color,
      strokeWidth: 1,
      opacity: 0.5
    });
  }
  
  return lines;
});

// 网格标签配置
const gridLabels = computed(() => {
  if (!props.gridConfig.enabled || !props.gridConfig.showCoordinates) return [];
  
  const parentSize = props.coordinateManager.getParentSize();
  const gridSize = props.gridConfig.size;
  const scroll = props.coordinateManager.getScrollOffset();
  const labels = [];
  
  // 计算范围
  const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
  const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
  const endX = startX + parentSize.width + gridSize;
  const endY = startY + parentSize.height + gridSize;
  
  // 每5个格子显示一个标签
  for (let x = startX; x <= endX; x += gridSize * 5) {
    labels.push({
      id: `grid-x-${x}`,
      x: x + 2,
      y: startY + 2,
      text: x.toString(),
      fontSize: 10,
      fill: props.gridConfig.color
    });
  }
  
  for (let y = startY; y <= endY; y += gridSize * 5) {
    labels.push({
      id: `grid-y-${y}`,
      x: startX + 2,
      y: y + 2,
      text: y.toString(),
      fontSize: 10,
      fill: props.gridConfig.color
    });
  }
  
  return labels;
});

// 标尺配置
const rulerWidth = 20;

// 水平标尺配置
const horizontalRulerConfig = computed(() => {
  const parentSize = props.coordinateManager.getParentSize();
  const scroll = props.coordinateManager.getScrollOffset();
  return {
    x: scroll.scrollLeft,
    y: scroll.scrollTop,
    width: parentSize.width,
    height: rulerWidth,
    fill: '#f5f5f5',
    stroke: '#e0e0e0',
    strokeWidth: 1
  };
});

// 垂直标尺置
const verticalRulerConfig = computed(() => {
  const parentSize = props.coordinateManager.getParentSize();
  const scroll = props.coordinateManager.getScrollOffset();
  return {
    x: scroll.scrollLeft,
    y: scroll.scrollTop,
    width: rulerWidth,
    height: parentSize.height,
    fill: '#f5f5f5',
    stroke: '#e0e0e0',
    strokeWidth: 1
  };
});

// 标尺刻度配置
const rulerTicks = computed(() => {
  const parentSize = props.coordinateManager.getParentSize();
  const gridSize = props.gridConfig.size;
  const scroll = props.coordinateManager.getScrollOffset();
  const ticks = [];
  
  // 计算范围
  const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
  const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
  const endX = startX + parentSize.width;
  const endY = startY + parentSize.height;
  
  // 水平刻度
  for (let x = startX; x <= endX; x += gridSize) {
    const isMajor = x % (gridSize * 5) === 0;
    ticks.push({
      id: `tick-h-${x}`,
      points: [
        x, 
        scroll.scrollTop + rulerWidth,
        x, 
        scroll.scrollTop + (isMajor ? 0 : rulerWidth/2)
      ],
      stroke: '#999',
      strokeWidth: 1
    });
  }
  
  // 垂直刻度
  for (let y = startY; y <= endY; y += gridSize) {
    const isMajor = y % (gridSize * 5) === 0;
    ticks.push({
      id: `tick-v-${y}`,
      points: [
        scroll.scrollLeft + rulerWidth,
        y,
        scroll.scrollLeft + (isMajor ? 0 : rulerWidth/2),
        y
      ],
      stroke: '#999',
      strokeWidth: 1
    });
  }
  
  return ticks;
});

// 标尺标签配置
const rulerLabels = computed(() => {
  const parentSize = props.coordinateManager.getParentSize();
  const gridSize = props.gridConfig.size;
  const scroll = props.coordinateManager.getScrollOffset();
  const labels = [];
  
  // 计算范围
  const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
  const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
  const endX = startX + parentSize.width;
  const endY = startY + parentSize.height;
  
  // 每5个格子显示一个标签
  for (let x = startX; x <= endX; x += gridSize * 5) {
    labels.push({
      id: `ruler-x-${x}`,
      x: x + 2,
      y: scroll.scrollTop + 2,
      text: x.toString(),
      fontSize: 9,
      fill: '#666'
    });
  }
  
  for (let y = startY; y <= endY; y += gridSize * 5) {
    labels.push({
      id: `ruler-y-${y}`,
      x: scroll.scrollLeft + 2,
      y: y + 2,
      text: y.toString(),
      fontSize: 9,
      fill: '#666'
    });
  }
  
  return labels;
});

// 更新连接的方法
const updateConnections = () => {
  connections.value = props.connections.map(conn => {
    const fromCard = props.cards.find(card => card.id === conn.from.cardId);
    const toCard = props.cards.find(card => card.id === conn.to.cardId);

    if (!fromCard || !toCard) {
      console.warn('找不到连接对应的卡片:', conn);
      return null;
    }

    const fromAnchor = fromCard.controller.anchors
      .find(anchor => anchor.id === conn.from.anchorId);
    const toAnchor = toCard.controller.anchors
      .find(anchor => anchor.id === conn.to.anchorId);

    if (!fromAnchor || !toAnchor || !fromAnchor.absolutePosition || !toAnchor.absolutePosition) {
      console.warn('找不到连接对应的锚点:', conn);
      return null;
    }

    return {
      id: `${conn.from.cardId}-${conn.from.anchorId}-${conn.to.cardId}-${conn.to.anchorId}`,
      ...drawConnection(
        null,
        fromAnchor.absolutePosition,
        toAnchor.absolutePosition,
        fromAnchor.side,
        toAnchor.side,
        `${conn.from.cardId}-${conn.from.anchorId}-${conn.to.cardId}-${conn.to.anchorId}`,
        props.connectionStyle.geometry,
        props.connectionStyle.drawingStyle
      )
    };
  }).filter(Boolean);
};

// 更新预览连接的方法
const updateConnectionPreview = (pos) => {
  if (!currentConnection.value) {
    previewConnection.value = null;
    return;
  }

  previewConnection.value = {
    id: 'preview',
    ...drawConnection(
      currentConnection.value.from.anchor.absolutePosition,
      pos,
      currentConnection.value.from.side,
      'auto',
      props.connectionStyle.geometry,
      props.connectionStyle.drawingStyle
    )
  };
};

// 事件处理
const handleStageMouseDown = (e) => {
  const pos = getRelativeMousePosition(e.evt);
  const targetAnchor = getAnchorFromEvent(e);
  if (targetAnchor) {
    startConnection(targetAnchor);
  }
};

const handleStageMouseMove = (e) => {
  if (currentConnection.value) {
    const pos = getRelativeMousePosition(e.evt);
    updateConnectionPreview(pos);
  }
};

const handleStageMouseUp = (e) => {
  if (currentConnection.value) {
    const targetAnchor = getAnchorFromEvent(e);
    finalizeConnection(targetAnchor);
  }
};

// 监听属性变化
watch(() => props.cards, updateConnections, { deep: true });
watch(() => props.connections, updateConnections, { deep: true });
watch(() => props.connectionStyle, updateConnections, { deep: true });

// 组件生命周期钩子
onMounted(() => {
  nextTick(() => {
    updateConnections();
    
    // 监听容器的事件
    props.coordinateManager.container.addEventListener('scroll', handleScroll);
    props.coordinateManager.container.addEventListener('wheel', handleScroll);
    props.coordinateManager.container.addEventListener('resize', handleResize);
    
    // 监听父容器的事件
    props.coordinateManager.parentElement.addEventListener('scroll', handleScroll);
    props.coordinateManager.parentElement.addEventListener('wheel', handleScroll);
    props.coordinateManager.parentElement.addEventListener('resize', handleResize);
    
    // 仍然需要监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 初始化位置和大小
    handleResize();
  });
});

onUnmounted(() => {
  // 移除容器的事件监听
  props.coordinateManager.container.removeEventListener('scroll', handleScroll);
  props.coordinateManager.container.removeEventListener('wheel', handleScroll);
  props.coordinateManager.container.removeEventListener('resize', handleResize);
  
  // 移除父容器的事件监听
  props.coordinateManager.parentElement.removeEventListener('scroll', handleScroll);
  props.coordinateManager.parentElement.removeEventListener('wheel', handleScroll);
  props.coordinateManager.parentElement.removeEventListener('resize', handleResize);
  
  // 移除窗口事件监听
  window.removeEventListener('resize', handleResize);
});

function getAnchorFromEvent(e) {
  // 从事件目标开始向上查找带有所需数据属性的元素
  let currentElement = e.target;
  let anchorId = null;
  let cardId = null;
  
  // 向上遍历 DOM 树，直到找到数据属性或达到文档根节点
  while (currentElement && (!anchorId || !cardId)) {
      anchorId = anchorId || currentElement.getAttribute('data-anchor-id');
      cardId = cardId || currentElement.getAttribute('data-card-id');
      
      // 如果已经到达连接画布或文档根节点，停止查找
      if (currentElement === connectionCanvas.value || currentElement === document.body) {
          break;
      }
      
      currentElement = currentElement.parentElement;
  }

  // 如果没有找到必要的属性，返回 null
  if (!anchorId || !cardId) {
      return null;
  }

  // 在卡片列表中查找对应的卡片
  const card = props.cards.find(card => card.id === cardId);
  if (!card) {
      console.warn('未找到对应的卡片:', cardId);
      return null;
  }

  // 在卡片中查找对应的锚点
  const anchor = card.controller.anchors.find(anchor => anchor.id === anchorId);
  if (!anchor) {
      console.warn('未找到对应的锚点:', anchorId);
      return null;
  }

  return {
      anchor,
      cardId,
      anchorId
  };
}

// 绘制网格
const drawGrid = () => {
  if (!gridLayer.value || !props.gridConfig.enabled) return;
  
  gridLayer.value.destroyChildren();
  
  const parentSize = props.coordinateManager.getParentSize();
  const gridSize = props.gridConfig.size;
  const scroll = props.coordinateManager.getScrollOffset();
  
  // 计算网格范围
  const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
  const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
  const endX = startX + parentSize.width + gridSize;
  const endY = startY + parentSize.height + gridSize;
  
  // 创建网格线组
  const gridGroup = new Konva.Group();
  
  // 绘制垂直线和水平线
  for (let x = startX; x <= endX; x += gridSize) {
    gridGroup.add(new Konva.Line({
      points: [x, startY, x, endY],
      stroke: props.gridConfig.color,
      strokeWidth: 1,
      opacity: 0.5
    }));
  }
  
  for (let y = startY; y <= endY; y += gridSize) {
    gridGroup.add(new Konva.Line({
      points: [startX, y, endX, y],
      stroke: props.gridConfig.color,
      strokeWidth: 1,
      opacity: 0.5
    }));
  }
  
  // 添加坐标标签
  if (props.gridConfig.showCoordinates) {
    for (let x = startX; x <= endX; x += gridSize * 5) {
      gridGroup.add(new Konva.Text({
        x: x + 2,
        y: startY + 2,
        text: x.toString(),
        fontSize: 10,
        fill: props.gridConfig.color
      }));
    }
    
    for (let y = startY; y <= endY; y += gridSize * 5) {
      gridGroup.add(new Konva.Text({
        x: startX + 2,
        y: y + 2,
        text: y.toString(),
        fontSize: 10,
        fill: props.gridConfig.color
      }));
    }
  }
  
  gridLayer.value.add(gridGroup);
  gridLayer.value.batchDraw();
};

// 绘制标尺
const drawRulers = () => {
  if (!rulerLayer.value) return;
  
  rulerLayer.value.destroyChildren();
  
  const parentSize = props.coordinateManager.getParentSize();
  const rulerWidth = 20;
  const scroll = props.coordinateManager.getScrollOffset();
  const gridSize = props.gridConfig.size;
  
  // 水平标尺背景
  rulerLayer.value.add(new Konva.Rect({
    x: scroll.scrollLeft,
    y: scroll.scrollTop,
    width: parentSize.width,
    height: rulerWidth,
    fill: '#f5f5f5',
    stroke: '#e0e0e0',
    strokeWidth: 1
  }));
  
  // 垂直标尺背景
  rulerLayer.value.add(new Konva.Rect({
    x: scroll.scrollLeft,
    y: scroll.scrollTop,
    width: rulerWidth,
    height: parentSize.height,
    fill: '#f5f5f5',
    stroke: '#e0e0e0',
    strokeWidth: 1
  }));
  
  // 计算标尺起始点
  const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
  const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
  
  // 水平刻度
  for (let x = startX; x <= startX + parentSize.width; x += gridSize) {
    const isMajor = x % (gridSize * 5) === 0;
    rulerLayer.value.add(new Konva.Line({
      points: [x, scroll.scrollTop + rulerWidth, x, scroll.scrollTop + (isMajor ? 0 : rulerWidth/2)],
      stroke: '#999',
      strokeWidth: 1
    }));
    
    if (isMajor) {
      rulerLayer.value.add(new Konva.Text({
        x: x + 2,
        y: scroll.scrollTop + 2,
        text: x.toString(),
        fontSize: 9,
        fill: '#666'
      }));
    }
  }
  
  // 垂直刻度
  for (let y = startY; y <= startY + parentSize.height; y += gridSize) {
    const isMajor = y % (gridSize * 5) === 0;
    rulerLayer.value.add(new Konva.Line({
      points: [scroll.scrollLeft + rulerWidth, y, scroll.scrollLeft + (isMajor ? 0 : rulerWidth/2), y],
      stroke: '#999',
      strokeWidth: 1
    }));
    
    if (isMajor) {
      rulerLayer.value.add(new Konva.Text({
        x: scroll.scrollLeft + 2,
        y: y + 2,
        text: y.toString(),
        fontSize: 9,
        fill: '#666',
        rotation: 0
      }));
    }
  }
  
  rulerLayer.value.batchDraw();
};

// 添加对网格配置的监听
watch(() => props.gridConfig, () => {
  drawGrid();
  drawRulers();
}, { deep: true });

// 监听窗口大小变化
const handleResize = () => {
  if (!connectionCanvas.value) return;
  
  const parentSize = props.coordinateManager.getParentSize();
  
  // 更新canvas容器的大小
  connectionCanvas.value.style.width = parentSize.width + 'px';
  connectionCanvas.value.style.height = parentSize.height + 'px';
  
  // 更新canvas容器的位置
  const containerRect = props.coordinateManager.container.getBoundingClientRect();
  connectionCanvas.value.style.top = containerRect.top + 'px';
  connectionCanvas.value.style.left = containerRect.left + 'px';
};

// 处理滚动
const handleScroll = () => {
  if (!connectionCanvas.value) return;
  
  // 更新canvas容器的位置
  const containerRect = props.coordinateManager.container.getBoundingClientRect();
  connectionCanvas.value.style.top = containerRect.top + 'px';
  connectionCanvas.value.style.left = containerRect.left + 'px';
};

// 添加对滚动位置的监听
watch(() => props.coordinateManager.getScrollOffset(), () => {
  handleScroll();
}, { deep: true });


const startConnection = ({ anchor, side, cardID }) => {
  // 初始化当前连接
  currentConnection.value = { from: { anchor, side, cardID }, to: null };
  document.addEventListener('mousemove', updateConnectionPreview);
  document.addEventListener('mouseup', finalizeConnection);
};

const finalizeConnection = (e) => {
  console.log(e)
  document.removeEventListener('mousemove', updateConnectionPreview);
  document.removeEventListener('mouseup', finalizeConnection);

  const toAnchor = getAnchorFromEvent(e);
  if (toAnchor && currentConnection.value) {
      // 通过事件发送新连接信息
      emit('connectionCreated', {
          from: {
              cardId: currentConnection.value.from.cardID,
              anchorId: currentConnection.value.from.anchor.id
          },
          to: {
              cardId: toAnchor.cardId,
              anchorId: toAnchor.anchor.id
          }
      });
  }

  // 清除临时连接
  connectionLayer.value.find('.preview').forEach(conn => conn.destroy());
  currentConnection.value = null;
  updateConnections();
};

// 监听 startConnection 事件
watch(() => props.cards, (newCards) => {
  newCards.forEach(card => {
    card.controller.anchors.forEach(anchor => {
      anchor.on('startConnection', startConnection);
    });
  });
}, { deep: true });

// 添加对 coordinateManager 的监听
watch(() => props.coordinateManager.getScrollOffset(), () => {
  handleScroll();
}, { deep: true });

watch(() => props.coordinateManager.getParentSize(), () => {
  handleResize();
}, { deep: true });

// 获取相对于容器的鼠标位置
const getRelativeMousePosition = (e) => {
  const containerRect = props.coordinateManager.container.getBoundingClientRect();
  const scroll = props.coordinateManager.getScrollOffset();
  return {
    x: e.clientX - containerRect.left + scroll.scrollLeft,
    y: e.clientY - containerRect.top + scroll.scrollTop
  };
};
</script>

<style scoped>
.connection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none; /* 允许点击穿透到下层元素 */
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto; /* 恢复画布的事件响应 */
  overflow: hidden;
}

/* 移除所有transform相关样式 */
:deep(.konva-container) {
  position: absolute !important;
  transform: none !important;
}
</style>