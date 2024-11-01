<template>
  <div class="floating-card" 
       :style="cardStyle"
       :data-card-id="cardId"

       @mouseenter="showHandles"
       @mouseleave="hideHandles"
       ref="card">
    <!-- 渲染四个方向的接口锚点 -->
    <template v-for="(anchors, side) in groupedAnchors" :key="side">
      <div :class="['anchor-container', `anchor-${side}`]">
        <div v-for="anchor in anchors" 
             :key="anchor.id"
             :class="['anchor-point', `anchor-${anchor.type}`]"
             :style="getAnchorStyle(anchor, side)"
             :title="anchor.label">
          <div class="anchor-dot"></div>
          <span class="anchor-label">{{ anchor.label }}</span>
        </div>
      </div>
    </template>

    <!-- 四周的缩放手柄 -->
    <div v-for="handle in resizeHandles" 
         :key="handle.position"
         class="resize-handle"
         :class="[`resize-${handle.position}`, { 'handle-visible': isHandleVisible }]"
         @mousedown.stop="(e) => startResize(e, handle.position)">
    </div>
    
    <!-- 原有的拖拽区域和内容 -->
    <div class="drag-handle" 
         @mousedown.stop="startDrag"
         :class="{ 'handle-visible': isHandleVisible }">
      <div class="handle-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5h12M2 8h12M2 11h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="card-header" v-if="title">
        {{ title }}
      </div>
    </div>
    
    <div class="card-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, provide, inject, watch, onMounted, nextTick } from 'vue'
import { v4 as uuidv4 } from '../../../../../static/uuid.mjs'

// Props 定义
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  position: {
    type: Object,
    default: () => ({
      x: 20,
      y: 20,
      width: 280,
      height: 160
    })
  }
})

// Refs
const card = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  width: 0,
  height: 0
})

// 添加位置和尺寸的验证函数
const validatePosition = (pos) => {
  const defaultPos = { x: 20, y: 20 }
  
  if (!pos) {
    console.warn('[CardContainer] 位置信息缺失，使用默认值:', defaultPos)
    return defaultPos
  }
  
  if (typeof pos.x !== 'number') {
    console.warn('[CardContainer] x坐标无效，应为数字类型，当前值:', pos.x)
    return { ...defaultPos, y: pos.y }
  }
  
  if (typeof pos.y !== 'number') {
    console.warn('[CardContainer] y坐标无效，应为数字类型，当前值:', pos.y)
    return { ...defaultPos, x: pos.x }
  }
  
  return { x: pos.x, y: pos.y }
}

const validateSize = (size) => {
  const defaultSize = { width: 280, height: 160 }
  const minSize = { width: 232, height: 132 }
  
  if (!size) {
    console.warn('[CardContainer] 尺寸信息缺失，使用默认值:', defaultSize)
    return defaultSize
  }
  
  const errors = []
  
  if (typeof size.width !== 'number') {
    errors.push(`宽度无效，应为数字类型，当前值: ${size.width}`)
  } else if (size.width < minSize.width) {
    errors.push(`宽度小于最小值 ${minSize.width}px，当前值: ${size.width}px`)
  }
  
  if (typeof size.height !== 'number') {
    errors.push(`高度无效，应为数字类型，当前值: ${size.height}`)
  } else if (size.height < minSize.height) {
    errors.push(`高度小于最小值 ${minSize.height}px，当前值: ${size.height}px`)
  }
  
  if (errors.length > 0) {
    console.warn('[CardContainer] 尺寸验证失败：\n', errors.join('\n'), '\n使用默认值:', defaultSize)
    return defaultSize
  }
  
  return { 
    width: Math.max(minSize.width, size.width), 
    height: Math.max(minSize.height, size.height) 
  }
}

const currentPos = ref(validatePosition(props.position))
const currentSize = ref(validateSize({
  width: props.position.width,
  height: props.position.height
}))
const isHandleVisible = ref(false)

// 定义缩放手柄位置
const resizeHandles = [
  { position: 'n' },  // 北
  { position: 's' },  // 南
  { position: 'e' },  // 东
  { position: 'w' },  // 西
  { position: 'ne' }, // 东北
  { position: 'nw' }, // 西北
  { position: 'se' }, // 东南
  { position: 'sw' }  // 西南
]

// Computed
const cardStyle = computed(() => ({
  left: `${props.position.x + currentPos.value.x - 16}px`,
  top: `${props.position.y + currentPos.value.y - 16}px`,
  width: `${currentSize.value.width}px`,
  height: `${currentSize.value.height}px`,
  position:'absolute'
}))

// 定义接口锚点数据结构
const anchors = ref([])

// 为卡片生成唯一ID
const cardId = uuidv4()

// 添加全局锚点注册方法
const registerGlobalAnchor = inject('registerGlobalAnchor');

// 修改锚点注册逻辑
const registerAnchor = (anchorConfig) => {
  const globalId = `${cardId}-${anchorConfig.id}`;
  
  // 注册到全局
  registerGlobalAnchor(cardId, {
    ...anchorConfig,
    globalId
  });
  
  // 添加到本地锚点列表
  anchors.value.push({
    ...anchorConfig,
    id: globalId
  });
  
  return globalId;
};

// 修改 unregisterAnchor 方法
const unregisterAnchor = (localId) => {
  const globalId = `${cardId}-${localId}`
  const index = anchors.value.findIndex(a => a.id === globalId)
  if (index !== -1) {
    anchors.value.splice(index, 1)
  }
}

// 提供给子组件的方法和数据
provide('registerAnchor', registerAnchor)
provide('unregisterAnchor', unregisterAnchor)
provide('cardId', cardId)

// 按方向分组锚点
const groupedAnchors = computed(() => {
  const groups = {
    left: [],
    right: [],
    top: [],
    bottom: []
  }
  
  anchors.value.forEach(anchor => {
    groups[anchor.side].push(anchor)
  })
  
  // 对每个方向的锚点按位置排序
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.position - b.position)
  })
  
  return groups
})

// 计算锚点位置样式
const getAnchorStyle = (anchor, side) => {
  const style = {
    '--anchor-position': `${anchor.position * 100}%`
  }
  
  return style
}

// Methods
const startDrag = (e) => {
  isDragging.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    startX: currentPos.value.x,
    startY: currentPos.value.y
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  
  currentPos.value = {
    x: dragStart.value.startX + deltaX,
    y: dragStart.value.startY + deltaY
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startResize = (e, position) => {
  e.preventDefault()
  isResizing.value = true
  
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: currentSize.value.width,
    height: currentSize.value.height,
    left: currentPos.value.x,
    top: currentPos.value.y,
    position
  }
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (e) => {
  if (!isResizing.value) return
  
  const deltaX = e.clientX - dragStart.value.x
  const deltaY = e.clientY - dragStart.value.y
  const pos = dragStart.value.position
  
  let newWidth = dragStart.value.width
  let newHeight = dragStart.value.height
  let newLeft = dragStart.value.left
  let newTop = dragStart.value.top
  
  // 根据不同方向处理缩放
  if (pos.includes('e')) newWidth = dragStart.value.width + deltaX
  if (pos.includes('w')) {
    newWidth = dragStart.value.width - deltaX
    newLeft = dragStart.value.left + deltaX
  }
  if (pos.includes('s')) newHeight = dragStart.value.height + deltaY
  if (pos.includes('n')) {
    newHeight = dragStart.value.height - deltaY
    newTop = dragStart.value.top + deltaY
  }
  
  // 应用最小尺寸限制
  const minWidth = 200
  const minHeight = 100
  
  if (newWidth >= minWidth) {
    currentSize.value.width = newWidth
    if (pos.includes('w')) currentPos.value.x = newLeft
  }
  
  if (newHeight >= minHeight) {
    currentSize.value.height = newHeight
    if (pos.includes('n')) currentPos.value.y = newTop
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const showHandles = () => {
  isHandleVisible.value = true
}

const hideHandles = () => {
  if (!isDragging.value && !isResizing.value) {
    isHandleVisible.value = false
  }
}

// 生命周期钩子
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})

// 修改计算锚点位置的方法
const calculateAnchorPosition = (anchor) => {
  const cardElement = card.value;
  if (!cardElement) return null;
  
  const cardRect = cardElement.getBoundingClientRect();
  const position = { x: 0, y: 0 };
  
  // 根据锚点的方向计算位置
  switch (anchor.side) {
    case 'left':
      position.x = cardRect.left;
      position.y = cardRect.top + (cardRect.height * anchor.position);
      break;
    case 'right':
      position.x = cardRect.right;
      position.y = cardRect.top + (cardRect.height * anchor.position);
      break;
    case 'top':
      position.x = cardRect.left + (cardRect.width * anchor.position);
      position.y = cardRect.top;
      break;
    case 'bottom':
      position.x = cardRect.left + (cardRect.width * anchor.position);
      position.y = cardRect.bottom;
      break;
  }
  
  return position;
};

// 定义 emit
const emit = defineEmits(['updateAnchorPosition']);

// 更新所有锚点位置
const updateAnchorsPosition = () => {
  anchors.value.forEach(anchor => {
    const position = calculateAnchorPosition(anchor);
    if (position) {
      emit('updateAnchorPosition', cardId, anchor.id, position);
    }
  });
};

// 监听卡片位置和尺寸变化
watch([currentPos, currentSize], () => {
  nextTick(() => {
    updateAnchorsPosition();
  });
});

// 在组件挂载后初始化位置
onMounted(() => {
  updateAnchorsPosition();
  window.addEventListener('resize', updateAnchorsPosition);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateAnchorsPosition);
});
</script>

<style scoped>
.floating-card {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  user-select: none;
  padding: 16px;
  position: relative;
}

.drag-handle {
  padding: 8px 12px;
  cursor: move;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to bottom, rgba(249, 250, 251, 0.8), rgba(244, 245, 246, 0.8));
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  opacity: 0;
  transition: all 0.2s ease;
  height: 40px;
  margin: -16px -16px 0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.handle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.drag-handle:hover .handle-icon {
  background-color: rgba(0, 0, 0, 0.04);
  color: #64748b;
}

.card-header {
  font-weight: 500;
  font-size: 14px;
  color: #1e293b;
  flex: 1;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
  max-height: calc(100% - 40px);
  position: relative;
  width: 100%;
  height: 100%;
}

.resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: transparent;
  z-index: 3;
}

.resize-handle::after {
  content: '';
  position: absolute;
  background: #e2e8f0;
  border-radius: 3px;
  transition: all 0.2s ease;
}

/* 添加新的缩放手柄样式 */
.resize-n { top: 0; left: 0; right: 0; height: 4px; cursor: n-resize; }
.resize-s { bottom: 0; left: 0; right: 0; height: 4px; cursor: s-resize; }
.resize-e { top: 0; right: 0; bottom: 0; width: 4px; cursor: e-resize; }
.resize-w { top: 0; left: 0; bottom: 0; width: 4px; cursor: w-resize; }
.resize-ne { top: 0; right: 0; width: 8px; height: 8px; cursor: ne-resize; }
.resize-nw { top: 0; left: 0; width: 8px; height: 8px; cursor: nw-resize; }
.resize-se { bottom: 0; right: 0; width: 8px; height: 8px; cursor: se-resize; }
.resize-sw { bottom: 0; left: 0; width: 8px; height: 8px; cursor: sw-resize; }

/* 悬停时显示手柄 */
.floating-card:hover .handle-visible {
  opacity: 1;
}

/* 锚点容器样式 */
.anchor-container {
  position: absolute;
  z-index: 2;
  pointer-events: auto;
}

.anchor-left {
  left: -32px;
  top: 0;
  bottom: 0;
  width: 32px;
  transform: none;
}

.anchor-right {
  right: -32px;
  top: 0;
  bottom: 0;
  width: 32px;
  transform: none;
}

.anchor-top {
  top: -32px;
  left: 0;
  right: 0;
  height: 32px;
  transform: none;
}

.anchor-bottom {
  bottom: -32px;
  left: 0;
  right: 0;
  height: 32px;
  transform: none;
}

/* 锚点样式 */
.anchor-point {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
}

.anchor-left .anchor-point {
  left: 4px;
  top: var(--anchor-position);
  transform: translateY(-50%);
  flex-direction: row;
}

.anchor-right .anchor-point {
  right: 4px;
  top: var(--anchor-position);
  transform: translateY(-50%);
  flex-direction: row-reverse;
}

.anchor-top .anchor-point {
  top: 4px;
  left: var(--anchor-position);
  transform: translateX(-50%);
  flex-direction: column;
}

.anchor-bottom .anchor-point {
  bottom: 4px;
  left: var(--anchor-position);
  transform: translateX(-50%);
  flex-direction: column-reverse;
}

.anchor-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #94a3b8;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1),
              0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.anchor-input .anchor-dot {
  background: #3b82f6;
  border-color: #eff6ff;
}

.anchor-output .anchor-dot {
  background: #10b981;
  border-color: #ecfdf5;
}

.anchor-label {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.anchor-point:hover {
  z-index: 4;
}

.anchor-point:hover .anchor-dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1),
              0 4px 8px rgba(0, 0, 0, 0.15);
}

.anchor-point:hover .anchor-label {
  opacity: 1;
}

/* 添加自定义滚动条样式（针对 Webkit 浏览器） */
.card-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.card-content::-webkit-scrollbar-track {
  background: transparent;
}

.card-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.card-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>