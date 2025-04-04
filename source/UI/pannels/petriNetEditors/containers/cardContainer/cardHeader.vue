<script setup>
const props = defineProps({
  // 卡片标题
  title: {
    type: String,
    default: ''
  },
  // 卡片操作按钮列表
  actions: {
    type: Array,
    default: () => []
  },
  // 是否显示拖拽手柄
  showHandle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'dragStart',  // 开始拖拽
  'actionClick' // 点击操作按钮
])

// 处理拖拽开始
const handleDragStart = (e) => {
  e.stopPropagation()
  emit('dragStart', e)
}

// 处理操作按钮点击
const handleActionClick = (action, e) => {
    console.log(action, e)
  e.stopPropagation() // 防止触发拖拽
  emit('actionClick',action, e)
}
</script>

<template>
  <div 
    class="drag-handle" 
    :class="{ 'handle-visible': showHandle }"
    @mousedown.stop="handleDragStart"
  >
    <div class="handle-icon">
      <!-- 拖拽图标 -->
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 16 16" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M2 5h12M2 8h12M2 11h12" 
          stroke="currentColor" 
          stroke-width="1.5" 
          stroke-linecap="round" 
        />
      </svg>
      
      <div class="fn__space"></div>
      
      <!-- 操作按钮 -->
      <template v-for="action in actions" :key="action.name">
        <svg 
          @click="($event)=>handleActionClick(action, $event)"
          :title="action.name" 
          class="b3-menu__icon"
          style="cursor: pointer;"
        >
          <use :xlink:href="action.icon"></use>
        </svg>
      </template>
    </div>

    <!-- 标题 -->
    <div v-if="title" class="card-header">
      {{ title }}
    </div>
  </div>
</template>

<style scoped>
.drag-handle {
  position: absolute;
  top: -22px;
  left: 0;
  right: 0;
  height: 20px;
  cursor: move;
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--b3-theme-surface);
  border-radius: 8px 8px 0 0;
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 2;
}

.handle-visible {
  opacity: 1;
}

.handle-icon {
  display: flex;
  align-items: center;
  gap: 4px;
}


.b3-menu__icon {
  width: 14px;
  height: 14px;
  padding: 2px;
  border-radius: 4px;
}

.b3-menu__icon:hover {
  background-color: var(--b3-theme-background-hover);
}

.card-header {
  margin-left: 8px;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
