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
            <template v-if="status === 'loading'">⌛</template>
            <template v-else-if="status === 'success'">✓</template>
            <template v-else-if="status === 'error'">✕</template>
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
          <span class="stream-content">
            {{ msg.content || '初始化神经连接...' }}
          </span>
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
import { computed, watch, onMounted } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => [
      'ai', 'user', 'system', 'vote', 
      'error', 'consensus', 'sse_stream',
      'default', 'warning', 'info'
    ].includes(v)
  },
  typeLabel: String,
  timestamp: [Number, Date],
  status: {
    type: String,
    default: 'default',
    validator: (v) => [
      'default', 'success', 'error', 
      'loading', 'pending', 'warning'
    ].includes(v)
  },
  interactive: Boolean,
  showHeader: {
    type: Boolean,
    default: true
  },
  align: {
    type: String,
    default: 'left',
    validator: v => ['left', 'right', 'center'].includes(v)
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

const formattedTime = computed(() => {
  if (!props.timestamp) return ''
  const date = new Date(props.timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// 简化事件触发
watch(() => props.msg?.content, () => {
  if (props.msg?.type === 'sse_stream') {
    emit('cursor-update')
  }
}, { deep: true })

// 组件挂载时也发送一次更新
onMounted(() => {
  if (props.msg?.type === 'sse_stream' && props.msg?.status === 'loading') {
    emit('cursor-update')
  }
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
</style> 