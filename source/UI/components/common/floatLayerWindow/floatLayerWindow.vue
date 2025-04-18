<template>
  <Teleport to="#float-layer-container" v-if="isMounted">
    <div class="float-layer-window" v-if="visible">
      <div class="float-layer" ref="floatLayer" @mouseenter="isHandleVisible = true"
        @mouseleave="isHandleVisible = false"
        :class="{ 
          'headless': headless,
          'no-background': !showBackground,
          'no-shadow': !showShadow,
          'no-border':!showBackground,
        }">
        <!-- 缩放手柄 -->
        <div v-for="handle in resizeHandles" :key="handle.position" class="resize-handle"
          :class="[`resize-${handle.position}`, { 'visible': isHandleVisible }]"
          @mousedown.stop="(e) => startResize(e, handle.position)">
        </div>

        <!-- 标题栏 -->
        <div v-if="!headless" class="float-header" @mousedown="startDrag">
          <span>{{ title }}</span>
          <button @click="close">×</button>
        </div>

        <!-- 修改内容区域的结构 -->
        <div class="content-wrapper" :class="{ 'draggable': headless }" @mousedown="headless ? startDrag($event) : undefined">
          <div class="content">
            <slot></slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { 防抖 } from '../../../../../src/toolBox/base/useEcma/forFunctions/forDebounce.js';
const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    required: true
  },
  initialWidth: {
    type: Number,
    default: 600
  },
  initialHeight: {
    type: Number,
    default: 800
  },
  initialX: {
    type: Number,
    default: 100
  },
  initialY: {
    type: Number,
    default: 100
  },
  headless: {
    type: Boolean,
    default: false
  },
  minWidth: {
    type: Number,
    default: 200  // 默认最小宽度
  },
  minHeight: {
    type: Number,
    default: 100  // 默认最小高度
  },
  showBackground: {
    type: Boolean,
    default: true  // 是否显示背景
  },
  showShadow: {
    type: Boolean,
    default: true  // 是否显示阴影
  }
})

const emit = defineEmits(['update:visible', 'resize', 'move'])

// refs
const floatLayer = ref(null)

// 状态
const isDragging = ref(false)
const isResizing = ref(false)
const isHandleVisible = ref(false)
const initialX = ref(0)
const initialY = ref(0)
const currentX = ref(0)
const currentY = ref(0)

const dragStart = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  left: 0,
  top: 0,
  position: ''
})

// 缩放手柄配置
const resizeHandles = [
  { position: 'n' },
  { position: 's' },
  { position: 'e' },
  { position: 'w' },
  { position: 'ne' },
  { position: 'nw' },
  { position: 'se' },
  { position: 'sw' }
]

// 添加挂载状态控制
const isMounted = ref(false)

// 确保容器只创建一次
const ensureContainer = () => {
  let container = document.getElementById('float-layer-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'float-layer-container'
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100%'
    container.style.height = '100%'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '1000'
    document.body.appendChild(container)
  }
  return container
}

// 拖拽方法
const startDrag = (e) => {
  isDragging.value = true
  initialX.value = e.clientX - currentX.value
  initialY.value = e.clientY - currentY.value
}

const onDrag = (e) => {
  if (isDragging.value) {
    e.preventDefault()
    currentX.value = e.clientX - initialX.value
    currentY.value = e.clientY - initialY.value

    // 确保不会拖出屏幕
    const maxX = window.innerWidth - floatLayer.value.offsetWidth
    const maxY = window.innerHeight - floatLayer.value.offsetHeight

    currentX.value = Math.max(0, Math.min(currentX.value, maxX))
    currentY.value = Math.max(0, Math.min(currentY.value, maxY))

    updatePosition()
    emit('move', { x: currentX.value, y: currentY.value })
  }
}

const stopDrag = () => {
  isDragging.value = false
}

// 缩放方法
const startResize = (e, position) => {
  e.preventDefault()
  isResizing.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: floatLayer.value.offsetWidth,
    height: floatLayer.value.offsetHeight,
    left: currentX.value,
    top: currentY.value,
    position
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

// 计算新的尺寸和位置
const calculateNewDimensions = (dx, dy, pos, dragStart) => {
  let newWidth = dragStart.width
  let newHeight = dragStart.height
  let newX = dragStart.left
  let newY = dragStart.top

  if (pos.includes('e')) {
    newWidth = Math.max(props.minWidth, dragStart.width + dx)
  }
  if (pos.includes('w')) {
    const w = Math.max(props.minWidth, dragStart.width - dx)
    newWidth = w
    newX = dragStart.left + (dragStart.width - w)
  }
  if (pos.includes('s')) {
    newHeight = Math.max(props.minHeight, dragStart.height + dy)
  }
  if (pos.includes('n')) {
    const h = Math.max(props.minHeight, dragStart.height - dy)
    newHeight = h
    newY = dragStart.top + (dragStart.height - h)
  }

  return { newWidth, newHeight, newX, newY }
}

// 更新窗口尺寸和位置
const updateWindowDimensions = (dimensions) => {
  const { newWidth, newHeight, newX, newY } = dimensions
  currentX.value = newX
  currentY.value = newY
  floatLayer.value.style.width = `${newWidth}px`
  floatLayer.value.style.height = `${newHeight}px`
  updatePosition()
  emit('resize', { width: newWidth, height: newHeight })
}

// 重构后的 onResize 函数
const onResize = (e) => {
  if (!isResizing.value) return

  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  const pos = dragStart.value.position

  防抖(() => {
    const newDimensions = calculateNewDimensions(dx, dy, pos, dragStart.value)
    updateWindowDimensions(newDimensions)
  })()
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const updatePosition = () => {
  if (floatLayer.value) {
    floatLayer.value.style.transform = `translate(${currentX.value}px, ${currentY.value}px)`
  }
}

const close = () => {
  emit('update:visible', false)
}

// 生命周期钩子
onMounted(() => {
  ensureContainer()
  nextTick(() => {
    isMounted.value = true
    nextTick(() => {
      if (floatLayer.value) {
        floatLayer.value.style.width = `${props.initialWidth}px`
        floatLayer.value.style.height = `${props.initialHeight}px`
        currentX.value = props.initialX
        currentY.value = props.initialY
        updatePosition()
      }
    })
  })
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.float-layer-window {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.float-layer {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--cc-theme-surface);
  box-shadow: var(--cc-dialog-shadow);
  border-radius: var(--cc-border-radius);
  pointer-events: auto;
  border: var(--cc-border-width) solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
}

.float-layer.no-background {
  background: transparent;
  border: none;
}

.float-layer.no-shadow {
  box-shadow: none;
}

.float-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--cc-space-sm);
  background: var(--cc-theme-surface-light);
  border-bottom: var(--cc-border-width) solid var(--cc-border-color);
  cursor: move;
  color: var(--cc-theme-on-surface);
  height: 40px;
}

.float-header h2 {
  margin: 0;
  font-size: var(--cc-size-icon-sm);
}

.float-header button {
  border: none;
  background: none;
  font-size: var(--cc-size-icon-xl);
  cursor: pointer;
  padding: var(--cc-space-sm);
  color: var(--cc-theme-on-surface);
  opacity: var(--cc-opacity-disabled);
  transition: opacity var(--cc-duration-fast) var(--cc-ease);
}

.float-header button:hover {
  opacity: 1;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

.content {
  position: absolute;
  inset: 0;
  padding: var(--cc-space-sm);
  overflow: auto;
}

.resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: transparent;
  z-index: 3;
  pointer-events: auto;
}

.resize-handle.visible {
  opacity: 1;
}

.resize-handle::after {
  content: '';
  position: absolute;
  background: var(--cc-theme-on-surface);
  border-radius: 3px;
  transition: all 0.2s ease;
}

.resize-n,
.resize-s {
  left: 0;
  right: 0;
  height: 8px;
  margin: 0 4px;
}

.resize-e,
.resize-w {
  top: 0;
  bottom: 0;
  width: 8px;
  margin: 4px 0;
}

.resize-n {
  top: -4px;
  cursor: n-resize;
}

.resize-s {
  bottom: -4px;
  cursor: s-resize;
}

.resize-e {
  right: -4px;
  cursor: e-resize;
}

.resize-w {
  left: -4px;
  cursor: w-resize;
}

.resize-ne,
.resize-nw,
.resize-se,
.resize-sw {
  width: 12px;
  height: 12px;
  margin: 0;
}

.resize-ne {
  top: 0;
  right: 0;
  cursor: ne-resize;
}

.resize-nw {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.resize-se {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

.resize-sw {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}

.resize-handle:hover::after {
  background: var(--cc-theme-primary);
}

.float-layer.headless {
  border-radius: var(--cc-border-radius);
}

.content-wrapper.draggable {
  cursor: move;
  user-select: none;
}

/* 当处于headless模式时,调整内容区域的padding */
.float-layer.headless .content-wrapper {
  height: 100%;
}

.float-layer.headless .content {
  height: 100%;
}
</style>
