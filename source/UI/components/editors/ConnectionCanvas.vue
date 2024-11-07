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
  
    // 根据起点锚点方向计算第一个���制点
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
  
    // 计算贝塞尔曲线上的点
    const getPointOnCubicBezier = (t) => {
      const mt = 1 - t;
      return {
        x: mt * mt * mt * start.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * end.x,
        y: mt * mt * mt * start.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * end.y
      };
    };
  
    // 创建连接组
    const connectionGroup = new Konva.Group({
      name: id
    });
  
    // 添加多个箭头
    const arrowCount = 3; // 箭头数量
    const arrowLength = 12; // 箭头长度
  
    for (let i = 1; i <= arrowCount; i++) {
      const t = i / (arrowCount + 1); // 计算位置比例
      const point = getPointOnCubicBezier(t);
      const nextPoint = getPointOnCubicBezier(t + 0.01);
      
      // 计算箭头角度
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
      
      // 计算箭头起点
      const arrowStart = {
        x: point.x - Math.cos(angle) * arrowLength,
        y: point.y - Math.sin(angle) * arrowLength
      };
  
      const arrow = new Konva.Arrow({
        points: [arrowStart.x, arrowStart.y, point.x, point.y],
        pointerLength: 8,
        pointerWidth: 6,
        fill: '#67C23A',
        stroke: '#67C23A',
        strokeWidth: 2
      });
  
      connectionGroup.add(arrow);
    }
  
    connectionGroup.add(path); // 确保路径在箭头下面
  
    // 添加交互效果
    connectionGroup.on('mouseover', () => {
      document.body.style.cursor = 'pointer';
      path.strokeWidth(3);
      connectionGroup.find('Arrow').forEach(arrow => {
        arrow.strokeWidth(3);
      });
      layer.value.batchDraw();
    });
  
    connectionGroup.on('mouseout', () => {
      document.body.style.cursor = 'default';
      path.strokeWidth(2);
      connectionGroup.find('Arrow').forEach(arrow => {
        arrow.strokeWidth(2);
      });
      layer.value.batchDraw();
    });
  
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