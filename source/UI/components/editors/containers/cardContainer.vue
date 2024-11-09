<template>
  <div class="floating-card" :style="cardStyle" :data-card-id="props.cardID" @mouseenter="handleFocus"
    @mouseleave="handleBlur" ref="card" tabindex="0">
    <!-- 渲染四个方向的接口锚点 -->
    <template v-for="(anchors, side) in groupedAnchors" :key="side">
      <div :class="['anchor-container', `anchor-${side}`]">
        <div v-for="anchor in anchors" :key="anchor.id" :class="['anchor-point', `anchor-${anchor.type}`, {
          'hidden': shouldHideAnchor(anchor)
        }]" :style="getAnchorStyle(anchor, side)" :title="anchor.label"
          @mousedown.stop="startConnectionDrag(anchor, side)" :data-anchor-id="anchor.id" :data-card-id="props.cardID">
          <div class="anchor-dot"></div>
          <span class="anchor-label">{{ anchor.label }}</span>
        </div>
      </div>
      <!-- 显示锚点数量 - 仅在未聚焦且有未连接锚点时显示 -->
      <div v-if="!isFocused.value && hasUnconnectedAnchorsForSide(side)"
        :class="['anchor-count', `anchor-count-${side}`]" :style="getAnchorCountStyle(side)">
        {{ unconnectedAnchorsCountForSide(side) }}
      </div>
    </template>
    <!-- 四周的缩放手柄 -->
    <div v-for="handle in resizeHandles" :key="handle.position" class="resize-handle"
      :class="[`resize-${handle.position}`, { 'handle-visible': isHandleVisible }]"
      @mousedown.stop="(e) => startResize(e, handle.position)">
    </div>
    <!-- 原有的拖拽区域和内容 -->
    <div class="drag-handle" @mousedown.stop="startDrag" :class="{ 'handle-visible': true }">
      <div class="handle-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 5h12M2 8h12M2 11h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <div class="fn__space"></div>
          <template v-for="action in cardActions" :key="action.name">
        
            <svg @click="action.action"   
            :title="action.name" class="b3-menu__icon " style="cursor: copy;"><use xlink:href="#iconCopy"></use></svg>
          </template>

      </div>
      <div class="card-header" v-if="title">
        {{ title }}
        <!-- 添加卡片操作按钮 -->
      </div>
    </div>
    <div class="card-content">
      <template v-if="props.component && component.template || component.render">
        <component :is="component" v-bind="componentProps" v-on="componentEvents" />
      </template>

    </div>
    <div v-if="isFocused.value" class="anchors">
      <!-- 显示锚点 -->
      <div class="anchor" v-for="anchor in anchors" :key="anchor.id">
        <!-- 锚点内容 -->
      </div>
    </div>
  <!-- 添加固定触发锚点 -->
  <template v-for="anchor in triggerAnchorPositions" :key="anchor.id">
    <div :class="['trigger-anchor-container', `trigger-anchor-${anchor.side}`]"
         v-show="isFocused.value">
      <div class="trigger-anchor-point"
           :data-anchor-id="anchor.id"
           :data-card-id="props.cardID"
           @mousedown.stop="startConnectionDrag(anchor, anchor.side)">
        <div class="trigger-anchor-dot"></div>
      </div>
    </div>
  </template>


  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, toRef, markRaw, watch, onMounted, nextTick, shallowRef } from 'vue';
import { v4 as uuidv4 } from '../../../../../static/uuid.mjs'; // 使用 UUID 生成唯一 ID

// Props 定义
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  card: {
    type: Object,

  },
  position: {
    type: Object,
    default: () => ({
      x: 20,
      y: 20,
      width: 280,
      height: 160
    })
  },
  nodeDefine: {
    type: Object
  },
  component: {
    type: Function,
    default: null
  },
  componentProps: {
    type: Object,
    default: () => ({})
  },
  componentEvents: {
    type: Object,
    default: () => ({})
  },
  anchors: {
    type: Array,
    default: []
  },
  cardID: {
    type: String,
    required: true
  },
  connections: {
    type: Array,
    default: () => []
  },
  triggerAnchors: {
    type: Array,
    default: () => ['left', 'right', 'top', 'bottom']
  },
  forcePosition: {
    type: Object,
    default: null
  }
})

// 计算已连接的锚点
const isAnchorConnected = (anchor) => {
  return props.connections.some(conn =>
    (conn.from.cardId === props.cardID && conn.from.anchorId === anchor.id) ||
    (conn.to.cardId === props.cardID && conn.to.anchorId === anchor.id)
  )
}


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
const cardStyle = computed(() => {
  console.log('aaa',currentPos.value,currentSize.value)
  let data= {
    left: `${currentPos.value.x}px`,
    top: `${currentPos.value.y}px`,
    width: `${currentSize.value.width}px`,
    height: `${currentSize.value.height}px`,
    position: 'absolute',
    color: error.value ? `var(--b3-card-error-color)` : "",
    border: error.value ? `1px solid var(--b3-card-error-color)` : "",
    backgroundColor: error.value ? `var(--b3-card-error-background)` : "",
    
  }
  console.log(data)
  return data
})

// 定义接口锚点数据结构
const anchors = toRef(props, 'anchors')

// 添加 isFocused 响应式变量
const isFocused = ref(false);

// 修改为使用方法而不是直接在模板中绑定事件
const handleFocus = () => {
  isFocused.value = true;
};

const handleBlur = () => {
  isFocused.value = false;
};

// 计算锚点位置样式
const getAnchorStyle = (anchor, side) => {
  const style = {
    '--anchor-position': `${anchor.position * 100}%`
  }

  return style
}

const startDrag = (e) => {
  if (props.componentProps?.isPreview) return;

  isDragging.value = true;
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    lastX: currentPos.value.x,
    lastY: currentPos.value.y,
    offsetX: e.clientX - currentPos.value.x,
    offsetY: e.clientY - currentPos.value.y
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e) => {
  if (!isDragging.value) return;

  const newPos = {
    x: e.clientX - dragStart.value.offsetX,
    y: e.clientY - dragStart.value.offsetY
  };

  // 计算相对于上一次位置的变化量
  const deltaX = newPos.x - dragStart.value.lastX;
  const deltaY = newPos.y - dragStart.value.lastY;

  // 更新上一次位置
  dragStart.value.lastX = newPos.x;
  dragStart.value.lastY = newPos.y;

  currentPos.value = newPos;

  // 触发移动事件，让父组件知道位置变化
  emit('onCardMove', props.cardID, {
    ...newPos,
    width: currentSize.value.width,
    height: currentSize.value.height,
    deltaX,
    deltaY,
    isDragging: true
  });
};

const stopDrag = (e) => {
  isDragging.value = false

  // 计算新位置时考虑初始偏移量，并确保不小于0
  currentPos.value = {
    x: Math.max(32, e.clientX - dragStart.value.offsetX),
    y: Math.max(32, e.clientY - dragStart.value.offsetY)
  }

  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}
const startResize = (e, position) => {
  if (props.componentProps?.isPreview) return;

  // 如果是固定尺寸，则不允许缩放
  if (fixedWidth && fixedHeight) {
    return;
  }

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

let component = shallowRef({})
let error = ref('')
// 生命周期钩子



let fixedWidth = 0
let fixedHeight = 0
onMounted(() => {
  currentPos.value = {
    x: props.position.x,
    y: props.position.y
  }
  currentSize.value = {
    width: props.position.width,
    height: props.position.height
  };
  props.card.moveTo=(newRelatedPosition)=>{
    console.error(newRelatedPosition,currentPos.value)
    currentPos.value.x=newRelatedPosition.x
    currentPos.value.y=newRelatedPosition.y

  }
  //这个需要提到最外面
  (async () => {
    try {
      component.value = await props.component(props.nodeDefine);
      if (props.nodeDefine.geom?.size === 'fixed') {
        fixedWidth = props.nodeDefine.geom.width
        fixedHeight = props.nodeDefine.geom.height
        currentSize.value = {
          width: fixedWidth,
          height: fixedHeight
        };
      }
    } catch (e) {
      console.error('组件定义获取失败', e)
      error.value = e
    }
  })()
})
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})


// 定义 emit
const emit = defineEmits(['onCardMove', 'startConnection', 'duplicateCard', 'startDuplicating']);

// 添加一个方法来获取当前卡片的 HTML 内容
const getCardPreviewContent = () => {
  const cardContent = card.value?.querySelector('.card-content');
  return cardContent ? cardContent.innerHTML : '';
};

// 修改复制卡片的方法
const duplicateCard = (e) => {
  e.stopPropagation();

  const newCardID = uuidv4();

  // 创建预览卡片数据，不包含位置信息
  const previewCard = {
    id: newCardID,
    title: props.title,
    position: {
      ...currentPos.value,
      width: currentSize.value.width,
      height: currentSize.value.height
    },
    cardID: newCardID,
    component: () => markRaw({
      template: `<div class="preview-content">${getCardPreviewContent()}</div>`,
      setup() {
        return {};
      }
    }),
    componentProps: {},
    nodeDefine: props.nodeDefine,
    anchors: [] // 预览时不需要锚点
  };

  // 创建实际要添加的卡片数据
  const newCard = {
    ...props.card.controller.cardInfo,
    id: newCardID,
    position: {
      ...currentPos.value,
      width: currentSize.value.width,
      height: currentSize.value.height
    }
  };

  // 发出开始复制事件
  emit('startDuplicating', {
    previewCard,
    actualCard: newCard,
    mouseEvent: e,
    sourcePosition: {
      x: currentPos.value.x,
      y: currentPos.value.y
    }
  });
};

// 修改卡片操作按钮的定义
const cardActions = [
  {
    name: '复制',
    action: (e) => duplicateCard(e),
    icon: '📋' // 可选：添加图标
  }
];

// 监听卡片位置和尺寸变化
watch(cardStyle, () => {
  // 只有在非预览状态下才触发卡片移动事件
  if (!props.componentProps?.isPreview) {
    nextTick(() => {
      emit('onCardMove', props.cardID, { ...currentPos.value, ...currentSize.value ,isDragging:isDragging.value});
    });
  }
});

// 按方向分组锚点
const groupedAnchors = computed(() => {
  const groups = {
    left: [],
    right: [],
    top: [],
    bottom: []
  };
  anchors.value.forEach(anchor => {
    groups[anchor.side].push(anchor);
  });
  // 对每个方向的锚点按位置排序
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.position - b.position);
  });
  return groups;
});

const startConnectionDrag = (anchor, side) => {
  // 触发自定义事件，通知父组件开始连接
  anchor.emit('startConnection', { anchor, side, cardID: props.cardID });
};

// 判断是否应该隐藏锚点
const shouldHideAnchor = (anchor) => {
  // 如果卡片被聚焦，显示所有锚点
  if (isFocused.value) {
    return false;
  }
  // 如果锚点已连接，始终显示
  if (isAnchorConnected(anchor)) {
    return false;
  }
  // 其他情况隐藏
  return true;
};

// 计算每个边上未连接的锚点数量
const unconnectedAnchorsCountForSide = (side) => {
  return props.anchors.filter(anchor => anchor.side === side && !isAnchorConnected(anchor)).length;
};

// 判断某个边上是否有未连接的锚点
const hasUnconnectedAnchorsForSide = (side) => {
  return unconnectedAnchorsCountForSide(side) > 0;
};

// 计算无连接标签的位置
const getAnchorCountStyle = (side) => {
  const connectedAnchors = props.anchors.filter(anchor => anchor.side === side && isAnchorConnected(anchor));
  const lastConnectedAnchor = connectedAnchors[connectedAnchors.length - 1];
  if (!lastConnectedAnchor) return {};

  const position = lastConnectedAnchor.position * 100;
  if (side === 'left' || side === 'right') {
    return { top: `calc(${position}% + 20px)` }; // 20px 偏移量
  } else {
    return { left: `calc(${position}% + 20px)` }; // 20px 偏移量
  }
};

// 添加对 position prop 的监听
watch(() => props.position, (newPosition) => {
  // 如果是预览模式(复制模式)，直接更新位置而不触发事件
  if (props.componentProps?.isPreview) {
    currentPos.value = {
      x: newPosition.x,
      y: newPosition.y
    };
    currentSize.value = {
      width: newPosition.width || currentSize.value.width,
      height: newPosition.height || currentSize.value.height
    };
  }

}, { deep: true });

// 添加固定触发锚点的计算属性
const triggerAnchorPositions = computed(() => {
  return props.triggerAnchors.map(side => ({
    id: `trigger-${side}`,
    side,
    type: 'trigger',
    position: 0.5 // 固定在中间位置
  }));
});

// 添加对 forcePosition 的监听
watch(() => props.forcePosition, (newPosition) => {

  if (newPosition && !isDragging.value) { // 只在非拖拽状态下接受强制位置更新
    console.error(newPosition,isDragging.value)

    currentPos.value = {
      x: newPosition.x,
      y: newPosition.y
    };
    if (newPosition.width && newPosition.height) {
      currentSize.value = {
        width: newPosition.width,
        height: newPosition.height
      };
    }
  }
}, { deep: true });

</script>

<style scoped>
.floating-card {
  position: absolute;
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 8px;
  box-shadow: var(--b3-dialog-shadow);
  z-index: 1;
  min-width: 200px;
  user-select: none;
  padding: 3px;
}

.drag-handle {
  position: absolute;
  top: -20px;
  left: 0;
  right: 0;
  cursor: move;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: all 0.2s ease;
  height: 20px;
  background: var(--b3-theme-surface);
  border-radius: 8px 8px 0 0;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.handle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--b3-theme-on-surface);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.drag-handle:hover .handle-icon {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-surface);
}

.card-header {
  font-weight: 500;
  font-size: 14px;
  color: var(--b3-theme-on-surface);
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
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.resize-handle {
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: transparent;
  z-index: 3;
  pointer-events: auto;
}

.resize-handle::after {
  content: '';
  position: absolute;
  background: var(--b3-theme-on-surface);
  border-radius: 3px;
  transition: all 0.2s ease;
  pointer-events: none;
}

/* 添加新的缩放手柄样式 */
.resize-n {
  top: -4px;
  left: 0;
  right: 0;
  height: 4px;
  cursor: n-resize;
  margin: 0 4px;
}

.resize-s {
  bottom: -4px;
  left: 0;
  right: 0;
  height: 4px;
  cursor: s-resize;
  margin: 0 4px;
}

.resize-e {
  top: 0;
  right: -4px;
  bottom: 0;
  width: 4px;
  cursor: e-resize;
  margin: 0 4px;
}

.resize-w {
  top: 0;
  left: -4px;
  bottom: 0;
  width: 4px;
  cursor: w-resize;
  margin: 0 4px;
}

.resize-ne {
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: ne-resize;
  margin: 4px;
}

.resize-nw {
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: nw-resize;
  margin: 4px;
}

.resize-se {
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: se-resize;
  margin: 4px;
}

.resize-sw {
  bottom: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: sw-resize;
  margin: 4px;
}

/* 悬停时显示手柄 */
.floating-card:hover .handle-visible {
  opacity: 1;
}

/* 锚点容器样式 */
.anchor-container {
  position: absolute;
  z-index: 4;
  pointer-events: none;
}

.anchor-left,
.anchor-right,
.anchor-top,
.anchor-bottom {
  transform: none;
}

.anchor-left {
  left: -12px;
  top: 0;
  bottom: 0;
  width: 32px;
  transform: none;

}

.anchor-right {
  right: -12px;
  top: 0;
  bottom: 0;
  width: 32px;
  transform: none;

}

.anchor-top {
  top: -12px;
  left: 0;
  right: 0;
  height: 32px;
  transform: none;

}

.anchor-bottom {
  bottom: -12px;
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
  pointer-events: auto;
  z-index: 4;
  transition: opacity 0.2s ease;
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
  background: var(--b3-theme-on-surface);
  border: 2px solid var(--b3-theme-surface);
  box-shadow: var(--b3-dialog-shadow);
  transition: all 0.2s ease;
}

.anchor-input .anchor-dot {
  background: var(--b3-theme-primary);
  border-color: var(--b3-theme-surface);
}

.anchor-output .anchor-dot {
  background: var(--b3-theme-success);
  border-color: var(--b3-theme-surface);
}

.anchor-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  font-weight: 500;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
  text-shadow: 0 1px 2px var(--b3-theme-background);
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

/* 添加自定义滚动���样式（针对 Webkit 浏览器） */
.card-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.card-content::-webkit-scrollbar-track {
  background: var(--b3-scroll-track);
}

.card-content::-webkit-scrollbar-thumb {
  background-color: var(--b3-scroll-color);
  border-radius: 3px;
}

.card-content::-webkit-scrollbar-thumb:hover {
  background-color: var(--b3-scroll-hover-color);
}

.anchor-point.hidden {
  opacity: 0;
  pointer-events: none;
}

.anchor-count {
  position: absolute;
  background: var(--b3-theme-surface);
  color: var(--b3-theme-on-surface);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
  z-index: 1;
  transition: opacity 0.2s ease;
  border: 1px solid var(--b3-border-color);
}

.anchor-count-left {
  left: -30px;
}

.anchor-count-right {
  right: -30px;
}

.anchor-count-top {
  top: -15px;
}

.anchor-count-bottom {
  bottom: -15px;
}

.anchor-count.hidden {
  opacity: 0;
  display: none;
}



.card-actions button {
  background: var(--b3-theme-surface);
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  padding: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.card-actions button:hover {
  background: var(--b3-list-hover);
}

.card-actions svg {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-on-surface);
}

/* 触发锚点容器样式 */
.trigger-anchor-container {
  position: absolute;
  z-index: 4;
  pointer-events: none;
}

.trigger-anchor-left {
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
}

.trigger-anchor-right {
  right: -24px;
  top: 50%;
  transform: translateY(-50%);
}

.trigger-anchor-top {
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
}

.trigger-anchor-bottom {
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
}

/* 触发锚点样式 */
.trigger-anchor-point {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  pointer-events: auto;
  cursor: pointer;
}

.trigger-anchor-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--b3-theme-orange, #FF9800);
  border: 2px solid var(--b3-theme-surface);
  box-shadow: var(--b3-dialog-shadow);
  transition: all 0.2s ease;
}

.trigger-anchor-point:hover .trigger-anchor-dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.15);
}
</style>