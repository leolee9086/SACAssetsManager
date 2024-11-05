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
    }
  });
  
  // Konva相关
  const connectionCanvas = ref(null);
  const stage = ref(null);
  const layer = ref(null);
  
  // 初始化 Konva
  const initKonva = () => {
    const container = connectionCanvas.value;
    stage.value = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight
    });
  
    layer.value = new Konva.Layer();
    stage.value.add(layer.value);
  };
  
  // 绘制贝塞尔曲线连接
  const drawBezierConnection = (start, end, startSide, endSide, id) => {
    const offset = 50; // 控制点偏移量
  
    // 计算控制点
    let cp1x, cp1y, cp2x, cp2y;
  
    // 根据起点锚点方向计算第一个控制点
    switch (startSide) {
      case 'right':
        cp1x = start.x + offset;
        cp1y = start.y;
        break;
      case 'left':
        cp1x = start.x - offset;
        cp1y = start.y;
        break;
      case 'top':
        cp1x = start.x;
        cp1y = start.y - offset;
        break;
      case 'bottom':
        cp1x = start.x;
        cp1y = start.y + offset;
        break;
      default:
        cp1x = start.x;
        cp1y = start.y;
    }
  
    // 根据终点锚点方向计算第二个控制点
    switch (endSide) {
      case 'right':
        cp2x = end.x + offset;
        cp2y = end.y;
        break;
      case 'left':
        cp2x = end.x - offset;
        cp2y = end.y;
        break;
      case 'top':
        cp2x = end.x;
        cp2y = end.y - offset;
        break;
      case 'bottom':
        cp2x = end.x;
        cp2y = end.y + offset;
        break;
      default:
        cp2x = end.x;
        cp2y = end.y;
    }
  
    // 删除已存在的连接
    layer.value.find(`.${id}`).forEach(conn => conn.destroy());
  
    // 创建路径
    const path = new Konva.Path({
      data: `M ${start.x} ${start.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${end.x} ${end.y}`,
      stroke: '#409EFF',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      strokeLinearGradientStartPoint: { x: start.x, y: start.y },
      strokeLinearGradientEndPoint: { x: end.x, y: end.y },
      strokeLinearGradientColorStops: [0, '#409EFF', 1, '#67C23A']
    });
  
    // 计算箭头
    const arrowLength = 15;
    const arrowAngle = Math.atan2(end.y - cp2y, end.x - cp2x);
    const arrowStart = {
      x: end.x - Math.cos(arrowAngle) * arrowLength,
      y: end.y - Math.sin(arrowAngle) * arrowLength
    };
  
    const arrow = new Konva.Arrow({
      points: [arrowStart.x, arrowStart.y, end.x, end.y],
      pointerLength: 10,
      pointerWidth: 8,
      fill: '#67C23A',
      stroke: '#67C23A',
      strokeWidth: 2
    });
  
    // 创建连接组
    const connectionGroup = new Konva.Group({
      name: id
    });
  
    // 添加交互效果
    connectionGroup.on('mouseover', () => {
      document.body.style.cursor = 'pointer';
      path.strokeWidth(3);
      arrow.strokeWidth(3);
      layer.value.batchDraw();
    });
  
    connectionGroup.on('mouseout', () => {
      document.body.style.cursor = 'default';
      path.strokeWidth(2);
      arrow.strokeWidth(2);
      layer.value.batchDraw();
    });
  
    connectionGroup.add(path);
    connectionGroup.add(arrow);
    layer.value.add(connectionGroup);
    layer.value.batchDraw();
  
    return connectionGroup;
  };
  
  // 更新连接
  const updateConnections = () => {
    props.connections.forEach(conn => {
      const fromCard = props.cards.find(card => card.id === conn.from.cardId);
      const toCard = props.cards.find(card => card.id === conn.to.cardId);
  
      if (!fromCard || !toCard) return;
  
      const fromAnchor = fromCard.controller.anchors
        .find(anchor => anchor.id === conn.from.anchorId);
      const toAnchor = toCard.controller.anchors
        .find(anchor => anchor.id === conn.to.anchorId);
  
      if (!fromAnchor || !toAnchor || !fromAnchor.absolutePosition || !toAnchor.absolutePosition) return;
  
      drawBezierConnection(
        fromAnchor.absolutePosition,
        toAnchor.absolutePosition,
        fromAnchor.side,
        toAnchor.side,
        `${conn.from.cardId}${conn.to.cardId}${conn.from.anchorId}${conn.to.anchorId}`
      );
    });
  };
  
  // 监听窗口大小变化
  const handleResize = () => {
    if (!connectionCanvas.value || !stage.value) return;
    
    stage.value.width(connectionCanvas.value.offsetWidth);
    stage.value.height(connectionCanvas.value.offsetHeight);
    updateConnections();
  };
  
  // 监听属性变化
  watch(() => props.cards, updateConnections, { deep: true });
  watch(() => props.connections, updateConnections, { deep: true });
  
  onMounted(() => {
    initKonva();
    updateConnections();
    window.addEventListener('resize', handleResize);
  });
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });
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
  }
  </style>