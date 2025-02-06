<template>
  <div 
    class="message-bubble"
    :class="[
      typeClass,
      { 'has-actions': $slots.actions },
      { 'interactive': interactive }
    ]"
    :data-align="align"
  >
    <!-- 消息头部 -->
    <div v-if="showHeader" class="message-header">
      <!-- 左侧信息 -->
      <div class="header-left">
        <slot name="header-left">
          <span v-if="typeLabel" class="type-label">{{ typeLabel }}</span>
          <span v-if="timestamp" class="timestamp">{{ formattedTime }}</span>
        </slot>
      </div>

      <!-- 右侧状态 -->
      <div class="header-right">
        <slot name="header-right">
          <span v-if="status" class="status-icon" :class="`status-${status}`">
            {{ 获取状态图标(status) }}
          </span>
        </slot>
      </div>
    </div>

    <!-- 消息主体 -->
    <div class="message-content">
      <!-- 新增投票状态显示 -->
      <div v-if="status === 'loading'" class="vote-loading">
        <span class="loading-dot">●</span>
        <span class="loading-dot">●</span>
        <span class="loading-dot">●</span>
      </div>

      <div v-if="meta?.weight" class="vote-meta">
        <span class="weight-badge">权重 {{ meta.weight }}</span>
        <div class="vote-progress">
          <div 
            v-for="(vote, i) in meta.votes" 
            :key="i"
            class="vote-bar"
            :style="{ width: `${vote * 10}%` }"
          ></div>
        </div>
      </div>

      <!-- 使用条件渲染来显示消息内容 -->
      <template v-if="msg?.type === 'sse_stream'">
        <div class="sse-stream">
          <div v-show="hasThinkContent" class="think-section">
            <div class="think-header" @click="toggleThink">
              <span class="think-icon">{{ isThinkExpanded ? '▼' : '▶' }}</span>
              <span class="think-title">思考过程</span>
            </div>
            <div class="think-content" :class="{ 'expanded': isThinkExpanded }" ref="thinkContentRef">
              {{ thinkContent }}
            </div>
          </div>
          <div class="stream-content">
            {{ normalContent || msg.content || '初始化神经连接...' }}
          </div>
          <span 
            v-if="msg.status === 'loading'" 
            class="stream-cursor animate-pulse"
          >█</span>
        </div>
      </template>
      <template v-else>
        <slot></slot>
      </template>
    </div>

    <!-- 扩展内容 -->
    <div v-if="$slots.extra" class="message-extra">
      <slot name="extra"></slot>
    </div>

    <!-- 操作按钮区 -->
    <div v-if="$slots.actions" class="message-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, ref, nextTick } from 'vue'
import { 格式化时间戳, 解析思考内容, 更新元素高度 } from '../utils/messageUtils.js'
import {
  验证消息类型,
  验证状态类型,
  验证对齐方式,
  是否为流式消息,
  检查状态转换,
  获取消息样式类,
  获取状态图标
} from '../utils/messageFormatUtils.js'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: 验证消息类型
  },
  typeLabel: String,
  timestamp: [Number, Date],
  status: {
    type: String,
    default: 'default',
    validator: 验证状态类型
  },
  interactive: Boolean,
  showHeader: {
    type: Boolean,
    default: true
  },
  align: {
    type: String,
    default: 'left',
    validator: 验证对齐方式
  },
  meta: {
    type: Object,
    default: () => ({})
  },
  streaming: {
    type: Boolean,
    default: false
  },
  msg: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['cursor-update'])

const typeClass = computed(() => `type-${props.type}`)

// 使用工具函数格式化时间
const formattedTime = computed(() => 格式化时间戳(props.timestamp))

// 状态控制
const isThinkExpanded = ref(false)
const thinkContent = ref('')
const normalContent = ref('')
const hasThinkContent = ref(false)

// 切换思考内容显示状态
const toggleThink = () => {
  isThinkExpanded.value = !isThinkExpanded.value
}

// 处理消息内容
watch(() => props.msg?.content, (新内容) => {
  if (新内容) {
    const { 思考内容, 普通内容, 有思考 } = 解析思考内容(新内容)
    thinkContent.value = 思考内容
    normalContent.value = 普通内容
    hasThinkContent.value = 有思考
  } else {
    // 重置状态
    thinkContent.value = ''
    normalContent.value = ''
    hasThinkContent.value = false
  }
}, { immediate: true })

// 监听消息状态
watch(() => props.msg?.status, (newStatus, oldStatus) => {
  if (检查状态转换(newStatus, oldStatus, props.msg?.content)) {
    const { 思考内容, 普通内容, 有思考 } = 解析思考内容(props.msg.content)
    thinkContent.value = 思考内容
    normalContent.value = 普通内容
    hasThinkContent.value = 有思考
  }
})

// 简化事件触发
watch(() => props.msg?.content, () => {
  if (props.msg?.type === 'sse_stream') {
    emit('cursor-update')
  }
}, { deep: true })

// 组件挂载时的更新
onMounted(() => {
  if (是否为流式消息(props.msg)) {
    emit('cursor-update')
  }
})

const thinkContentRef = ref(null)

// 使用工具函数更新元素高度
watch(() => hasThinkContent.value, (newValue) => {
  if (newValue) {
    nextTick(() => {
      if (thinkContentRef.value) {
        更新元素高度(thinkContentRef.value, isThinkExpanded.value)
      }
    })
  }
})

// 修改展开状态监听
watch(() => isThinkExpanded.value, (newValue) => {
  nextTick(() => {
    if (thinkContentRef.value) {
      更新元素高度(thinkContentRef.value, newValue)
    }
  })
})
</script>

<style scoped>
.message-bubble {
  position: relative;
  margin: 0.8rem 0;
  padding: 1rem;
  border-radius: 4px;
  background: rgba(20, 20, 20, 0.9);
  border-left: 3px solid;
  transition: all 0.2s ease;
  width: 80%;
  max-width: 780px;
  align-self: flex-start;
  box-sizing: border-box;
  word-break: break-word;
}

.message-bubble[data-align="right"] {
  align-self: flex-end;
  background: rgba(30, 30, 50, 0.9);
  border-left: none;
  border-right: 3px solid;
  width: 80%;
  max-width: 780px;
}

.message-bubble[data-align="center"] {
  align-self: center;
  width: 90%;
  background: rgba(0, 30, 30, 0.9);
  border-left: none;
  text-align: center;
}

.message-bubble.interactive {
  cursor: pointer;
}
.message-bubble.interactive:hover {
  transform: translateX(3px);
}

/* 头部样式 */
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  font-size: 0.8em;
  opacity: 0.8;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.type-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.timestamp {
  font-family: 'Courier New', monospace;
}

/* 状态图标 */
.status-icon {
  font-size: 1.2em;
}
.status-loading { color: #ff0; animation: pulse 1s infinite; }
.status-success { color: #0f0; }
.status-error { color: #f00; }

/* 内容区域 */
.message-content {
  line-height: 1.5;
  font-family: 'MS Gothic', monospace;
}

/* 操作按钮区 */
.message-actions {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

/* 扩展信息区 */
.message-extra {
  margin-top: 0.8rem;
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  font-size: 0.9em;
}

/* 类型样式 */
.type-ai { border-color: #0f0; }
.type-user { border-color: #0ff; }
.type-system { border-color: #ff0; }
.type-warning { border-color: #f90; }
.type-error { border-color: #f00; }
.type-info { border-color: #0af; }
.type-console { border-color: #666; }
.type-debug { border-color: #909; }
.type-success { border-color: #0f0; }
.type-consensus { border-color: #0f0; }

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .message-bubble {
    width: 95%;
    max-width: 95%;
  }
}

/* 新增投票样式 */
.vote-meta {
  margin-top: 0.8rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.weight-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: rgba(0,255,0,0.2);
  border: 1px solid #0f0;
  font-size: 0.8em;
}

.vote-progress {
  display: flex;
  gap: 2px;
  height: 4px;
  margin-top: 0.5rem;
}

.vote-bar {
  background: linear-gradient(to right, 
    rgba(0,255,0,0.6), 
    rgba(0,255,127,0.8));
  transition: width 0.5s ease;
}

/* 新增加载动画 */
.vote-loading {
  margin-top: 0.8rem;
  display: flex;
  gap: 0.3rem;
}

.loading-dot {
  animation: dot-pulse 1.4s infinite;
  opacity: 0.3;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 思考内容样式 */
.think-section {
  margin-bottom: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.think-header {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  user-select: none;
}

.think-header:hover {
  background: rgba(255, 255, 255, 0.1);
}

.think-icon {
  margin-right: 0.5rem;
  font-family: monospace;
  transition: transform 0.2s ease;
}

.think-title {
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.7);
}

.think-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
  background: rgba(0, 0, 0, 0.2);
  font-family: monospace;
  white-space: pre-wrap;
  padding: 0;
}

.think-content.expanded {
  padding: 0.8rem;
}

.stream-content {
  margin-top: 0.5rem;
  line-height: 1.5;
}
</style> 