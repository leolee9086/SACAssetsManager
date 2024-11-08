<template>
    <div ref="connectionCanvas" class="connection-canvas">
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, watch } from 'vue';
  import _Konva from '../../../../static/konva.js'
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
    coordinateManager:{
      type: Array,
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
  
  // Konva相关
  const connectionCanvas = ref(null);
  const stage = ref(null);
  const layer = ref(null);
  const gridLayer = ref(null);
  const rulerLayer = ref(null);
  
  const currentConnection = ref(null);
  
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
  
    rulerLayer.value = new Konva.Layer();
    stage.value.add(rulerLayer.value);
  
    layer.value = new Konva.Layer();
    stage.value.add(layer.value);
  
    drawGrid();
    drawRulers();
  };
  import { drawConnection } from './geometry/BezierConnectionDrawer.js';
  
  // 更新连接
  const updateConnections = () => {
    // 清除所有现有连接
    layer.value.destroyChildren();
    
    // 重新绘制所有连接
    props.connections.forEach(conn => {
        const fromCard = props.cards.find(card => card.id === conn.from.cardId);
        const toCard = props.cards.find(card => card.id === conn.to.cardId);

        if (!fromCard || !toCard) {
            console.warn('找不到连接对应的卡片:', conn);
            return;
        }

        const fromAnchor = fromCard.controller.anchors
            .find(anchor => anchor.id === conn.from.anchorId);
        const toAnchor = toCard.controller.anchors
            .find(anchor => anchor.id === conn.to.anchorId);

        if (!fromAnchor || !toAnchor || !fromAnchor.absolutePosition || !toAnchor.absolutePosition) {
            console.warn('找不到连接对应的锚点:', conn);
            return;
        }
        
        drawConnection(
            layer.value,
            fromAnchor.absolutePosition,
            toAnchor.absolutePosition,
            fromAnchor.side,
            toAnchor.side,
            `${conn.from.cardId}-${conn.from.anchorId}-${conn.to.cardId}-${conn.to.anchorId}`,
            props.connectionStyle.geometry,
            props.connectionStyle.drawingStyle
        );
    });
    
    // 强制更新层
    layer.value.batchDraw();
  };
  
  // 监听窗口大小变化
  const handleResize = () => {
    if (!connectionCanvas.value || !stage.value) return;
    
    const parentSize = props.coordinateManager.getParentSize();
    stage.value.width(parentSize.width);
    stage.value.height(parentSize.height);
    
    // 更新stage位置以匹配滚动
    const scroll = props.coordinateManager.getScrollOffset();
    stage.value.position({
      x: -scroll.scrollLeft,
      y: -scroll.scrollTop
    });
    console.log(scroll.scrollTop,scroll.scrollLeft)
    connectionCanvas.value.style.top=scroll.scrollTop+'px'
    connectionCanvas.value.style.left=scroll.scrollLeft+'px'

    // 重绘网格和标尺
    drawGrid();
    drawRulers();

    stage.value.batchDraw();
  };

  // 添加滚动监听
  const handleScroll = () => {
    if (!stage.value) return;
    
    const scroll = props.coordinateManager.getScrollOffset();
    
    // 更新stage位置以匹配滚动
    stage.value.position({
      x: -scroll.scrollLeft,
      y: -scroll.scrollTop
    });
    
    // 更新canvas元素的位置
    connectionCanvas.value.style.top = scroll.scrollTop + 'px';
    connectionCanvas.value.style.left = scroll.scrollLeft + 'px';

    // 重绘网格和标尺
    drawGrid();
    drawRulers();

    stage.value.batchDraw();
  };

  // 监听属性变化
  watch(() => props.cards, updateConnections, { deep: true });
  watch(() => props.connections, (newConnections) => {
    console.log('连接数量:', newConnections.length, newConnections);
    updateConnections();
  }, { deep: true });
  watch(() => props.connectionStyle, updateConnections, { deep: true });
  
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
    drawConnection(
        layer.value,
        currentConnection.value.from.anchor.absolutePosition,
        mousePosition,
        currentConnection.value.from.side,
        'auto',
        'preview',
        props.connectionStyle.geometry,
        props.connectionStyle.drawingStyle
    );
    
    // 强制更新层
    layer.value.batchDraw();
  };

  const emit = defineEmits(['connectionCreated']);

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
    initKonva();
    updateConnections();
    window.addEventListener('resize', handleResize);
    props.coordinateManager.container.addEventListener('scroll', handleScroll);
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    props.coordinateManager.container.removeEventListener('scroll', handleScroll);
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
    
    // 计算网格起始点（考虑滚动位置）
    const startX = Math.floor(scroll.scrollLeft / gridSize) * gridSize;
    const startY = Math.floor(scroll.scrollTop / gridSize) * gridSize;
    
    // 绘制垂直线
    for (let x = startX; x <= startX + parentSize.width; x += gridSize) {
      gridLayer.value.add(new Konva.Line({
        points: [x, scroll.scrollTop, x, scroll.scrollTop + parentSize.height],
        stroke: props.gridConfig.color,
        strokeWidth: 1,
        opacity: 0.5
      }));
      
      // 添加坐标标签
      if (props.gridConfig.showCoordinates && x % (gridSize * 5) === 0) {
        gridLayer.value.add(new Konva.Text({
          x: x + 2,
          y: scroll.scrollTop + 2,
          text: x.toString(),
          fontSize: 10,
          fill: props.gridConfig.color
        }));
      }
    }
    
    // 绘制水平线
    for (let y = startY; y <= startY + parentSize.height; y += gridSize) {
      gridLayer.value.add(new Konva.Line({
        points: [scroll.scrollLeft, y, scroll.scrollLeft + parentSize.width, y],
        stroke: props.gridConfig.color,
        strokeWidth: 1,
        opacity: 0.5
      }));
      
      // 添加坐标标签
      if (props.gridConfig.showCoordinates && y % (gridSize * 5) === 0) {
        gridLayer.value.add(new Konva.Text({
          x: scroll.scrollLeft + 2,
          y: y + 2,
          text: y.toString(),
          fontSize: 10,
          fill: props.gridConfig.color
        }));
      }
    }
    
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
  }
  </style>