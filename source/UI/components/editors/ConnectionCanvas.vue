<template>
  <div ref="connectionCanvas" class="connection-canvas" :style="{
    transformOrigin: 'top left'
  }">
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import _Konva from '../../../../static/konva.js'
import { drawGrid, drawRulers } from './geometry/backgroundDrawer.js';
const Konva = _Konva.default
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
  coordinateManager: {
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
  },
  cardsContainer: {
    type: Object,

  },
  relations: {
    type: Array,
    default: () => []
  },
  zoom: {
    type: Number,
    default: 1
  }
});

// Konva相关
const connectionCanvas = ref(null);
const stage = ref(null);
const layer = ref(null);
const gridLayer = ref(null);
const rulerLayer = ref(null);
const currentConnection = ref(null);
// 创建 ResizeObserver
const resizeObserver = ref(null);
// 添加防抖相关变量
const rafId = ref(null);
// 添加一个空闲回调队列
const idleCallbackQueue = ref([]);

// 初始化 Konva
const initKonva = () => {
  const container = connectionCanvas.value;
  const parentSize = props.coordinateManager.getParentSize();

  stage.value = new Konva.Stage({
    container: container,
    width: parentSize.width,
    height: parentSize.height
  });

  gridLayer.value = new Konva.Layer();
  stage.value.add(gridLayer.value);
  gridLayer.value.scale({ x: props.zoom, y: props.zoom });

  rulerLayer.value = new Konva.Layer();
  stage.value.add(rulerLayer.value);
  rulerLayer.value.scale({ x: props.zoom, y: props.zoom });

  layer.value = new Konva.Layer();
  stage.value.add(layer.value);
  layer.value.scale({ x: props.zoom, y: props.zoom });

  drawGrid(gridLayer.value, {
    ...props.gridConfig,
    size: props.gridConfig.size
  }, props.coordinateManager);
  
  drawRulers(rulerLayer.value, {
    ...props.gridConfig,
    size: props.gridConfig.size
  }, props.coordinateManager);
};
import { 构造连接线组, drawRelation } from './geometry/BezierConnectionDrawer.js';
// 添加 relations 相关的函数
const updateRelations = () => {
  // 清除所有现有 relations
  layer.value.find('.relation').forEach(relation => relation.destroy());
  // 重新绘制所有 relations
  props.relations.forEach(relation => {
    const fromCard = props.cards.find(card => card.id === relation.from.cardId);
    const toCard = props.cards.find(card => card.id === relation.to.cardId);
    if (!fromCard || !toCard) {
      console.warn('找不到relation对应的卡片:', relation);
      return;
    }
    drawRelation(
      layer.value,
      fromCard.position,
      toCard.position,
      `relation-${relation.from.cardId}-${relation.to.cardId}`,
      props.connectionStyle.geometry,
      props.connectionStyle.drawingStyle
    );
  });
  // 强制更新层
  layer.value.batchDraw();
};
const 查找卡片 = (卡片组, 属性名, 属性值) => {
  return 卡片组.find(卡片 => 卡片[属性名] === 属性值)
}
const 从卡片查找锚点 = (卡片, 属性名, 属性值) => {
  let 锚点组 = 卡片.controller.anchors
  return 锚点组.find(锚点 => 锚点[属性名] === 属性值)
}
const 从卡片组查找锚点 = (卡片组, 卡片查询函数, 锚点查询函数) => {
  // 先查找卡片
  const 目标卡片 = 卡片查询函数(卡片组);
  if (!目标卡片) {
    console.warn('未找到目标卡片');
    return null;
  }
  // 再从卡片中查找锚点
  const 目标锚点 = 锚点查询函数(目标卡片);
  if (!目标锚点) {
    console.warn('未找到目标锚点');
    return null;
  }
  return 目标锚点;
}
const 以连接定义构造连接线组 =(连接定义)=>{
  const fromAnchor = 从卡片组查找锚点(
      props.cards,
      (卡片组) => 查找卡片(卡片组, 'id', 连接定义.from.cardId),
      (卡片) => 从卡片查找锚点(卡片, 'id', 连接定义.from.anchorId)
    );
    
    const toAnchor = 从卡片组查找锚点(
      props.cards,
      (卡片组) => 查找卡片(卡片组, 'id', 连接定义.to.cardId),
      (卡片) => 从卡片查找锚点(卡片, 'id', 连接定义.to.anchorId)
    );

    if (!fromAnchor || !toAnchor ) {
      console.warn('找不到连接对应的锚点:', 连接定义,fromAnchor,toAnchor);
      return;
    }
    if(!fromAnchor.absolutePosition || !toAnchor.absolutePosition){
      console.warn('找不到连接对应的锚点坐标:', 连接定义,fromAnchor.absolutePosition,toAnchor.absolutePosition);
      return
    }
    let 连接线组 = 构造连接线组(
      fromAnchor.absolutePosition,
      toAnchor.absolutePosition,
      fromAnchor.side,
      toAnchor.side,
      `${连接定义.from.cardId}-${连接定义.from.anchorId}-${连接定义.to.cardId}-${连接定义.to.anchorId}`,
      props.connectionStyle.geometry,
      props.connectionStyle.drawingStyle
    );
    return 连接线组
}
// 更新连接
const updateConnections = () => {
  // 清除所有现有连接
  layer.value.destroyChildren();
  // 重新绘制所有连接
  props.connections.forEach(连接定义 => {
    let 连接线组 = 以连接定义构造连接线组(连接定义);
    if (连接线组) {
      layer.value.add(连接线组);
    }
  });
  // 强制更新层
  layer.value.batchDraw();
};

// 修改 handleResize 函数
const handleResize = () => {
  if (!connectionCanvas.value || !stage.value) return;
  updateStage();
};
// 抽取公共更新逻辑到新函数
const updateStage = () => {
  const parentSize = props.coordinateManager.getParentSize();
  stage.value.width(parentSize.width );
  stage.value.height(parentSize.height );
  
  const scroll = props.coordinateManager.getScrollOffset();
  stage.value.position({
    x: -scroll.scrollLeft*props.zoom,
    y: -scroll.scrollTop*props.zoom
  });
  // 更新所有层的大小以填满 stage

  // 更新所有层的缩放
  [gridLayer.value, rulerLayer.value, layer.value].forEach(layer => {
    if (layer) {
      layer.scale({ 
        x: props.zoom, 
        y: props.zoom 
      });
      // 确保层的位置从左上角开始
      layer.position({
        x: 0,
        y: 0
      });
    }
  });

  // 更新网格和标尺
  drawGrid(gridLayer.value, {
    ...props.gridConfig,
    size: props.gridConfig.size
  }, props.coordinateManager,props.zoom||1);
  
  drawRulers(rulerLayer.value, {
    ...props.gridConfig,
    size: props.gridConfig.size
  }, props.coordinateManager,props.zoom||1);
  
  stage.value.batchDraw();
};
const handleScroll = (e) => {
  updateStage();
};
// 添加对 zoom 属性的监听
watch(() => props.zoom, () => {
  if (stage.value) {
    updateStage();
  }
}, { immediate: true });

// 监听属性变化
watch(() => props.cards, updateConnections, { deep: true });
watch(() => props.cards, updateRelations, { deep: true });

watch(() => props.connections, (newConnections) => {
  console.log('连接数量:', newConnections.length, newConnections);
  updateConnections();
}, { deep: true });
watch(() => props.connectionStyle, updateConnections, { deep: true });
watch(() => props.relations, updateRelations, { deep: true });

const startConnection = ({ anchor, side, cardID }) => {
  // 初始化当前连接
  currentConnection.value = { from: { anchor, side, cardID }, to: null };
  document.addEventListener('mousemove', updateConnectionPreview);
  document.addEventListener('mouseup', finalizeConnection);
};

const updateConnectionPreview = (e) => {
  if (!currentConnection.value) return;

  // 清除之前的预览连接
  layer.value.find('.preview').forEach(conn => conn.destroy());

  const containerRect = connectionCanvas.value.getBoundingClientRect();
  const mousePosition = {
    x: e.clientX - containerRect.left,
    y: e.clientY - containerRect.top
  };
  // 绘制临时连接线
  let 连接线组= 构造连接线组(
    currentConnection.value.from.anchor.absolutePosition,
    mousePosition,
    currentConnection.value.from.side,
    'auto',
    'preview',
    props.connectionStyle.geometry,
    props.connectionStyle.drawingStyle
  );
  layer.value.add(连接线组)

  // 强制更新层
  layer.value.batchDraw();
};

const emit = defineEmits(['connectionCreated','connectionFailed']);

const finalizeConnection = (e) => {
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
  }else{
    emit('connectionFailed',e)
  }
  // 清除临时连接
  layer.value.find('.preview').forEach(conn => conn.destroy());
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

onMounted(() => {
  initKonva()
  nextTick(() => {
    // 初始化 ResizeObserver
    resizeObserver.value = new ResizeObserver((entries) => {
      handleResize();
    });

    // 监听容器的大小变化
    if (props.coordinateManager.container) {
      resizeObserver.value.observe(props.coordinateManager.container);
    }

    // 监听父容器的大小变化
    if (props.coordinateManager.parentElement) {
      resizeObserver.value.observe(props.coordinateManager.parentElement);
    }

    // 监听父容器的父容器大小变化
    if (props.coordinateManager.parentElement.parentElement) {
      resizeObserver.value.observe(props.coordinateManager.parentElement.parentElement);
    }

    // 其他事件监听
    props.coordinateManager.container.addEventListener('scroll', updateStage);
    props.coordinateManager.container.addEventListener('wheel', updateStage);
    props.cardsContainer.parentElement.addEventListener('scroll', updateStage);
    props.cardsContainer.parentElement.addEventListener('wheel', updateStage);

    // 仍然需要监听窗口大小变化
    window.addEventListener('resize', handleResize);

    // 初始化位置和大小
    handleResize();

    updateConnections();
    updateRelations();
  });
});

onUnmounted(() => {
  // 清理 ResizeObserver
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }

  // 移除其他事件监听
  if (props.coordinateManager.container) {
    props.coordinateManager.container.removeEventListener('scroll', handleScroll);
    props.coordinateManager.container.removeEventListener('wheel', handleScroll);
  }

  if (props.coordinateManager.parentElement) {
    props.coordinateManager.parentElement.removeEventListener('scroll', handleScroll);
    props.coordinateManager.parentElement.removeEventListener('wheel', handleScroll);
  }

  window.removeEventListener('resize', handleResize);

  if (rafId.value) {
    if (window.cancelIdleCallback) {
      cancelIdleCallback(rafId.value);
    } else {
      clearTimeout(rafId.value);
    }
  }
  idleCallbackQueue.value = [];
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

// 修改网格配置监听
watch(() => props.gridConfig, () => {
  drawGrid(gridLayer.value, props.gridConfig, props.coordinateManager);
  drawRulers(rulerLayer.value, props.gridConfig, props.coordinateManager);
}, { deep: true });

// 添加对 zoom 属性的监听
watch(() => props.zoom, () => {
  if (stage.value) {
    updateStage();
  }
}, { immediate: true });
</script>

<style scoped>
.connection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  background-color: var(--b3-theme-background, #ffffff);
  will-change: transform; /* 优化性能 */
}
</style>