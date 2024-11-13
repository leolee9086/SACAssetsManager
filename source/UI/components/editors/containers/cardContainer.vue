<template>
  <div class="floating-card" :style="cardStyle" :data-card-id="props.card.id" @mouseenter="handleFocus"
    @mouseleave="handleBlur" ref="card" tabindex="0">
    <!-- 渲染四个方向的接口锚点 -->
    <template v-for="(anchors, side) in groupedAnchors" :key="side">
      <div :class="['anchor-container', `anchor-${side}`]">
        <div v-for="anchor in anchors" :key="anchor.id" :class="['anchor-point', `anchor-${anchor.type}`, {
          'hidden': shouldHideAnchor(anchor)
        }]" :style="getAnchorStyle(anchor, side)" :title="anchor.label"
          @mousedown.stop="startConnectionDrag(anchor, side)" :data-anchor-id="anchor.id" :data-card-id="props.card.id">
          <div class="anchor-dot"></div>
          <div class="anchor-label">{{ anchor.label }}:{{ typeof anchor.getValue() }}
            <div class="anchor-values">{{ anchor.getValue() }}</div>
          </div>
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

          <svg @click="action.action" :title="action.name" class="b3-menu__icon " style="cursor: copy;">
            <use :xlink:href="action.icon"></use>
          </svg>
        </template>

      </div>
      <div class="card-header" v-if="props.card.title">
        {{ props.card.title }}
        <!-- 添加卡片操作按钮 -->
      </div>
    </div>
    <div class="card-content">
      <template v-if="error">
        <errorContainer :error="error" altMessage="组件加载错误"></errorContainer>
      </template>
      <template v-else>
        <ErrorBoundary v-if="props.component&&component" @error="handleComponentError">
          <component  :is="component" v-bind="componentProps"
            v-on="componentEvents" />
        </ErrorBoundary>
        <div v-else class="loading">加载中...</div>

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
      <div :class="['trigger-anchor-container', `trigger-anchor-${anchor.side}`]" v-show="isFocused.value">
        <div class="trigger-anchor-point" :data-anchor-id="anchor.id" :data-card-id="props.card.id"
          @mousedown.stop="startConnectionDrag(anchor, anchor.side)">
          <div class="trigger-anchor-dot"></div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onUnmounted, toRef, markRaw, watch, onMounted, nextTick, shallowRef, defineComponent } from 'vue';
import *  as _serialize from '../../../../../static/serialize-javascript.js'
import errorContainer from './errorContainer.vue';
import { ErrorBoundary } from '../../common/wraper/utilsComponent.js';
import { 按指定值分组 } from '../../../../utils/array/groupBy.js';
import { validateSize, validatePosition } from '../geometry/validatGeometry.js';
import { getAnchorStyle } from './nodeDefineParser/controllers/anchorConfig.js';
import * as 向量 from '../geometry/geometryCalculate/vector.js';
import { createDuplicationEventData } from './nodeDefineParser/controllers/cardConfig.js';
import { 根据连接表查找锚点是否有连接 } from './nodeDefineParser/controllers/anchor.js';
import { css长宽转换器, 二维转换器 } from '../geometry/utils/pointFormatters.js';
import { anchorSides } from '../types.js';

const handleComponentError = (err) => {
  console.error('Component runtime error:', err);
  error.value = err;
  component.value = {};
};
const serialize = _serialize.default.default
// 自定义序列化处理器
// Props 定义
const props = defineProps({
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

  connections: {
    type: Array,
    default: () => []
  },
  triggerAnchors: {
    type: Array,
    default: () =>Object.values(anchorSides)
  },
  forcePosition: {
    type: Object,
    default: null
  },
  zoom: {
    type: Number,
    default: null
  }
})
// 计算已连接的锚点
const isAnchorConnected = (anchor) => {
  return 根据连接表查找锚点是否有连接(props.connections, props.card.id, anchor.id)

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
const 当前卡片元素位置 = ref(validatePosition(props.card.position))
const 应用位置 = (position) => {
  当前卡片元素位置.value = 二维转换器.抽取对应值转对象(position)
}
const 应用尺寸 = (position) => {
  当前卡片元素尺寸.value = css长宽转换器.抽取对应值转对象(position)
}
const 当前卡片元素尺寸 = ref(validateSize({
  width: props.card.position.width,
  height: props.card.position.height
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
  let data = {
    left: `${当前卡片元素位置.value.x}px`,
    top: `${当前卡片元素位置.value.y}px`,
    width: `${当前卡片元素尺寸.value.width}px`,
    height: `${当前卡片元素尺寸.value.height}px`,
    position: 'absolute',
    color: error.value ? `var(--b3-card-error-color)` : "",
    border: error.value ? `1px solid var(--b3-card-error-color)` : "",
    backgroundColor: error.value ? `var(--b3-card-error-background)` : "",
  }
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
// 修改拖拽相关的方法
const startDrag = (e) => {
  if (props.componentProps?.isPreview) return;
  isDragging.value = true;
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    lastX: 当前卡片元素位置.value.x,
    lastY: 当前卡片元素位置.value.y,
    offsetX: (e.clientX - 当前卡片元素位置.value.x * props.zoom) / props.zoom,
    offsetY: (e.clientY - 当前卡片元素位置.value.y * props.zoom) / props.zoom
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};
const stopDrag = (e) => {
  isDragging.value = false
  // 计算新位置时考虑初始偏移量，并确保不小于0
  当前卡片元素位置.value = {
    x: Math.max(32, e.clientX - dragStart.value.offsetX * props.zoom) / props.zoom,
    y: Math.max(32, e.clientY - dragStart.value.offsetY * props.zoom) / props.zoom
  }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}
// 修改缩放相关的方法
const startResize = (e, position) => {
  if (props.componentProps?.isPreview) return;
  if (fixedWidth && fixedHeight) return;
  e.preventDefault();
  isResizing.value = true;
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: 当前卡片元素尺寸.value.width,
    height: 当前卡片元素尺寸.value.height,
    left: 当前卡片元素位置.value.x,
    top: 当前卡片元素位置.value.y,
    position
  };
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
};


// 抽取空间变换相关的工具函数
const 空间变换工具 = {
  创建变换空间: (zoom, offset = null) => ({
    缩放: {
      系数: 1 / zoom,
      矩阵: 向量.值(2, 1 / zoom)
    },
    偏移: offset
  }),

  应用空间变换: (向量组, 变换空间) => {
    const 变换结果 = 向量.逐元积(
      变换空间.偏移 ? 向量.减(向量组, 变换空间.偏移) : 向量组,
      变换空间.缩放.矩阵
    )
    return 变换结果
  },

  计算状态变更: (新状态, 原状态) => {
    return {
      位置: {
        新: 新状态.位置,
        增量: 向量.减(新状态.位置, 原状态.位置)
      },
      尺寸: 新状态.尺寸
    }
  }
}

// 重构后的拖拽处理函数
const onDrag = (e) => {
  if (!isDragging.value) return
  const 变换空间 = 空间变换工具.创建变换空间(
    props.zoom,
    [dragStart.value.offsetX * props.zoom, dragStart.value.offsetY * props.zoom]
  )
  const 事件坐标 = [e.clientX, e.clientY]
  const 原状态 = {
    位置: [dragStart.value.lastX, dragStart.value.lastY]
  }
  const 新位置 = 空间变换工具.应用空间变换(事件坐标, 变换空间)
  const 状态变更 = 空间变换工具.计算状态变更(
    { 位置: 新位置 },
    原状态
  )
  // 更新状态
  dragStart.value = {
    ...dragStart.value,
    lastX: 新位置[0],
    lastY: 新位置[1]
  }
  当前卡片元素位置.value = 二维转换器.点数组转对象(新位置)
  emit('onCardMove', props.card.id, {
    x: 新位置[0],
    y: 新位置[1],
    width: 当前卡片元素尺寸.value.width,
    height: 当前卡片元素尺寸.value.height,
    deltaX: 状态变更.位置.增量[0],
    deltaY: 状态变更.位置.增量[1],
    isDragging: true
  })
}

// 重构后的缩放处理函数
const onResize = (e) => {
  if (!isResizing.value) return
  const 变换空间 = 空间变换工具.创建变换空间(props.zoom)
  const 几何约束 = {
    尺寸: { 下限: [200, 100] }
  }
  const 事件位移 = 向量.减(
    [e.clientX, e.clientY],
    [dragStart.value.x, dragStart.value.y]
  )
  const 缩放位移 = 空间变换工具.应用空间变换(事件位移, 变换空间)
  // 处理尺寸和位置的变换
  const 处理几何变换 = (方向, 位移, 初始状态) => {
    const 变换矩阵 = {
      尺寸: [
        { 基向量: 'e', 系数: 1 }, { 基向量: 'w', 系数: -1 },
        { 基向量: 's', 系数: 1 }, { 基向量: 'n', 系数: -1 }
      ],
      位置: [
        { 基向量: 'w', 系数: 1 }, { 基向量: 'n', 系数: 1 }
      ]
    }

    const 计算变换 = (变换基, 向量) => [
      变换基.some(基 => 方向.includes(基.基向量)) ?
        变换基.find(基 => 方向.includes(基.基向量))?.系数 * 向量[0] : 0,
      变换基.some(基 => 方向.includes(基.基向量)) ?
        变换基.find(基 => 方向.includes(基.基向量))?.系数 * 向量[1] : 0
    ]

    const 变换结果 = {
      尺寸: 向量.加(初始状态.尺寸, 计算变换(变换矩阵.尺寸, 位移)),
      位置: 向量.加(初始状态.位置, 计算变换(变换矩阵.位置, 位移))
    }
    return 变换结果
  }
  const 初始状态 = {
    尺寸: [dragStart.value.width, dragStart.value.height],
    位置: [dragStart.value.left, dragStart.value.top]
  }
  const 变换结果 = 处理几何变换(dragStart.value.position, 缩放位移, 初始状态)
  // 应用约束
  const 约束后尺寸 = 向量.下钳制(变换结果.尺寸, 几何约束.尺寸.下限)
  const 约束满足性 = 向量.逐元比较(约束后尺寸, 变换结果.尺寸)
  // 更新位置和尺寸
  const 位置更新掩码 = [
    dragStart.value.position.includes('w') && 约束满足性[0],
    dragStart.value.position.includes('n') && 约束满足性[1]
  ]
  const 当前位置 = [当前卡片元素位置.value.x, 当前卡片元素位置.value.y]
  const 新位置 = 向量.逐元选择(位置更新掩码, 变换结果.位置, 当前位置)
  当前卡片元素尺寸.value = css长宽转换器.点数组转对象(约束后尺寸)
  当前卡片元素位置.value = 二维转换器.点数组转对象(新位置)
  emit('onCardMove', props.card.id, {
    ...当前卡片元素位置.value,
    width: 当前卡片元素尺寸.value.width,
    height: 当前卡片元素尺寸.value.height,
    isDragging: false
  })
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
const emit = defineEmits(['onCardMove', 'startConnection', 'duplicateCard', 'startDuplicating','deleteCard']);
// 定义 emit
// 添加一个方法来获取当前卡片的 HTML 内容
const getCardPreviewContent = () => {
  const cardContent = card.value?.querySelector('.card-content');
  return cardContent ? cardContent.innerHTML : '';
};
// 修改复制卡片的方法
const duplicateCard = (event) => {
  event.stopPropagation();
  let duplicationData = createDuplicationEventData(event, props.card.title, props.nodeDefine, props.card.controller.cardInfo, 当前卡片元素尺寸.value, 当前卡片元素位置.value, getCardPreviewContent())
  emit('startDuplicating', duplicationData);
};
// 修改卡片操作按钮的定义
const cardActions = [
  {
    name: '复制',
    action: (e) => duplicateCard(e),
    icon: '#iconCopy'
  },
  {
    name: '删除',
    action: (e) => {
      e.stopPropagation();
      emit('deleteCard', props.card.id);
    },
    icon: '#iconTrashcan'
  }
];
// 监听卡片位置和尺寸变化
watch(cardStyle, () => {
  // 只有在非预览状态下才触发卡片移动事件
  if (!props.componentProps?.isPreview) {
    nextTick(() => {
      emit('onCardMove', props.card.id, { ...当前卡片元素位置.value, ...当前卡片元素尺寸.value, isDragging: isDragging.value });
    });
  }
});

// 按方向分组锚点
const groupedAnchors = computed(() => {
  const groups= 按指定值分组(anchors.value,'side',Object.values(anchorSides))
  console.log("groups",groups)
  Object.values(groups).forEach(group => {
    group.sort((a, b) => a.position - b.position);
  });
  return groups;
});

const startConnectionDrag = (anchor, side) => {
  // 触发自定义事件，通知父组件开始连接
  anchor.emit('startConnection', { anchor, side, cardID: props.card.id });
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
// 添加固定触发锚点的计算属性
const triggerAnchorPositions = computed(() => {
  return props.triggerAnchors.map(side => ({
    id: `trigger-${side}`,
    side,
    type: 'trigger',
    position: 0.5 // 固定在中间位置
  }));
});
// 添加对 position prop 的监听
watch(() => props.card.position, (position) => {
  // 如果是预览模式(复制模式)，直接更新位置而不触发事件
  if (props.componentProps?.isPreview) {
    应用位置(position)
    应用尺寸(position)
  }

}, { deep: true });

// 添加对 forcePosition 的监听
watch(() => props.forcePosition, (position) => {
  if (position && !isDragging.value) { // 只在非拖拽状态下接受强制位置更新
    应用位置(position)
    应用尺寸(position)
  }
}, { deep: true });
// 修改组件加载逻辑，确保状态更新
const loadComponent = async () => {
  try {
    if (props.component) {
      console.log('Loading component...');
      component.value = null; // 清空当前组件
      const comp = await props.component(props.nodeDefine);
      console.log('Component loaded:', comp);
      if (!comp?.template && !comp?.render) {
        throw new Error('组件定义无效');
      }
      component.value = markRaw(comp);
      console.log('Component set:', component.value);
    }
  } catch (e) {
    console.error('Component loading failed:', e);
    handleComponentError(e);
  }
};
onMounted(() => {
  let { position } = props.card
  应用位置(position)
  应用尺寸(position)
  props.card && (props.card.moveTo = 应用位置);
  props.card && (props.card.sizeTo = 应用尺寸);
  nextTick(
    () => loadComponent()
  )
});
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
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
  background-color: var(--anchor-background);
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
  background: var(--anchor-dot);
  border: 2px solid var(--anchor-border);
  box-shadow: var(--b3-dialog-shadow);
  transition: all 0.2s ease;
}

.anchor-point:not(.anchor-point:hover) .anchor-label {
  display: none
}

.anchor-label {
  font-size: 12px;
  color: var(--anchor-text);
  font-weight: 500;
  transition: all 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
  text-shadow: 0 1px 2px var(--b3-theme-background);
  position: absolute;
}

.anchor-left .anchor-label {
  right: 26px;
  background-color: var(--b3-theme-surface);
}

.anchor-right .anchor-label {
  left: 26px;
  background-color: var(--b3-theme-surface);
}

.anchor-top .anchor-label {
  bottom: 26px;
  background-color: var(--b3-theme-surface);
}

.anchor-bottom .anchor-label {
  top: 26px;
  background-color: var(--b3-theme-surface);
}

.anchor-point:hover {
  background-color: var(--anchor-hover);
}

.anchor-point.is-connected {
  background-color: var(--anchor-active);
}

.anchor-point.is-connected .anchor-label {
  color: var(--anchor-active-text);
}

/* 添加自定义滚动样式（针对 Webkit 浏览器） */
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

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  color: var(--b3-theme-on-surface-light);
}
</style>