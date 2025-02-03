<template>
  <div class="main-output border-green">
    <div class="panel-header consensus-header">
      <h3 class="neon-text">REI</h3>
      <div class="controls">
        <span 
          @click="$emit('toggle-messages')"
          class="toggle-text"
          :class="{ 'active': showMessages }"
        >
          {{ showMessages ? 'HIDE MAGI OUTPUT' : 'SHOW MAGI OUTPUT' }}
        </span>
        <div class="consensus-status">
          <span class="status-flag">SECURITY LEVEL: </span>
          <span class="status-code">███</span>
        </div>
      </div>
    </div>

    <!-- 添加全局连接状态显示 -->
    <div class="global-status">
      <div 
        v-for="status in connectionStatuses" 
        :key="status.name"
        class="status-item"
      >
        <span class="status-name">{{ status.name }}</span>
        <span class="status-led" :class="status.class"></span>
      </div>
      <div class="sync-rate">
        同步率: {{ syncRate }}%
      </div>
    </div>

    <div class="message-container" ref="container">
      <MessageBubble
        v-for="(msg, i) in messages"
        :key="`consensus-${i}`"
        :type="msg.type"
        :type-label="getTypeLabel(msg.type)"
        :timestamp="msg.timestamp"
        :status="msg.status"
        :align="getMessageAlign(msg.type)"
        :meta="msg.meta"
      >
        <template v-if="msg.type === 'system' && msg.progress">
          <div class="progress-container">
            <div class="progress-bar" :style="{ width: `${msg.progress}%` }"></div>
            <span class="progress-text">{{ msg.content }}</span>
          </div>
        </template>
        <template v-else>
          {{ formatContent(msg) }}
        </template>
      </MessageBubble>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  seels: {
    type: Array,
    default: () => []
  },
  showMessages: {
    type: Boolean,
    default: true
  }
})

defineEmits(['toggle-messages'])

// 计算连接状态
const connectionStatuses = computed(() => {
  return props.seels.map(seel => ({
    name: seel.config.name,
    class: seel.loading ? 'loading' : 
           seel.connected ? 'connected' : 'disconnected'
  }))
})

// 计算同步率
const syncRate = computed(() => {
  const connectedCount = props.seels.filter(s => s.connected).length
  return Math.round((connectedCount / props.seels.length) * 100)
})

// 自动滚动到底部
const container = ref(null)
watch(() => props.messages.length, () => {
  nextTick(() => {
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight
    }
  })
})

// 新增对齐逻辑
const getMessageAlign = (type) => {
  switch(type) {
    case 'user': return 'right'
    case 'system': return 'center'
    default: return 'left'
  }
}

const getTypeLabel = (type) => {
  switch(type) {
    case 'consensus': return 'MAGI CONSENSUS'
    case 'user': return 'USER INPUT'
    case 'system': return 'SYSTEM PROCESS'
    default: return type.toUpperCase()
  }
}

const formatContent = (msg) => {
  if (msg.meta?.type === 'vote-status') {
    const statusMap = {
      '通过': '✓',
      '复议': '⚠',
      '否决': '✕',
      '弃权': '➖',
      '超时': '⌛',
      '异常': '❗'
    }
    
    return [
      `[投票状态] 进度: ${msg.meta.progress}%`,
      ...msg.meta.details.map(d => {
        const statusIcon = statusMap[d.conclusion] || '❓'
        return `${d.name} ${statusIcon} | 权重 ${d.weight} | ${d.conclusion}`
      })
    ].join('\n')
  }
  return msg.content
}
</script>

<style scoped>
.main-output {
  flex: 1;
  margin: 1rem;
  background: rgba(0, 30, 30, 0.9);
  border: 2px solid #0f0;
  box-shadow: 0 0 15px #0f0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.consensus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, 
    rgba(0, 30, 0, 0.8), 
    rgba(0, 60, 0, 0.5),
    rgba(0, 30, 0, 0.8));
  height: 50px;
  flex-shrink: 0;
}

/* 全局状态样式 */
.global-status {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 20, 0, 0.5);
  border-bottom: 1px solid rgba(0, 255, 0, 0.3);
  flex-shrink: 0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-name {
  font-size: 0.8em;
  color: #0f0;
}

.status-led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-led.connected {
  background: #0f0;
  box-shadow: 0 0 5px #0f0;
  animation: pulse 1.5s infinite;
}

.status-led.loading {
  background: #ff0;
  box-shadow: 0 0 5px #ff0;
  animation: pulse 0.8s infinite;
}

.status-led.disconnected {
  background: #f00;
  box-shadow: 0 0 5px #f00;
}

.sync-rate {
  font-family: 'MS Gothic', monospace;
  color: #0f0;
  text-shadow: 0 0 5px #0f0;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.consensus-msg {
  border-color: #0f0;
  background: rgba(0, 30, 0, 0.9);
}

.user-msg {
  border-color: #0ff;
  background: rgba(0, 20, 30, 0.9);
}

.warning-msg {
  border-color: #f00;
  background: rgba(30, 0, 0, 0.9);
  animation: alert-flash 1s infinite;
}

.system-msg {
  border-color: #ff0;
  background: rgba(30, 30, 0, 0.9);
  animation: alert-flash 1s infinite;
}

.message-label {
  display: block;
  font-size: 0.7em;
  text-transform: uppercase;
  color: #7f8c8d;
  margin-bottom: 0.3rem;
}

/* 自定义滚动条 */
.message-container::-webkit-scrollbar {
  width: 6px;
}

.message-container::-webkit-scrollbar-track {
  background: rgba(0, 20, 20, 0.5);
}

.message-container::-webkit-scrollbar-thumb {
  background: #0ff;
  border-radius: 3px;
}

/* 添加新的控制按钮样式 */
.controls {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.toggle-text {
  color: #0ff;
  font-family: 'MS Gothic', monospace;
  font-size: 0.8em;
  cursor: pointer;
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.toggle-text:hover {
  opacity: 1;
  text-shadow: 0 0 5px #0ff;
}

.toggle-text.active {
  opacity: 1;
  text-shadow: 0 0 5px #0ff;
}

.neon-text {
  color: #0f0;
  text-shadow: 0 0 10px #0f0;
  font-size: 1.5em;
  margin: 0;
  font-family: 'MS Gothic', monospace;
  letter-spacing: 0.2em;
}

.consensus-status {
  font-family: 'MS Gothic', monospace;
}

/* 调整消息容器样式 */
.message-container {
  flex: 1;
  min-height: 200px;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-sizing: border-box;
}

/* 调整消息气泡基础样式 */
.message-bubble {
  margin: 0.2rem 0;
  background: rgba(0, 30, 30, 0.9);
  border-left-width: 4px;
  max-width: 90%;
  flex: 0 0 auto;
  min-width: 20%;
}

/* 类型颜色调整 */
.type-consensus { border-color: #0f0; }
.type-user { border-color: #0ff; }
.type-warning { border-color: #f00; }
.type-system { border-color: #ff0; }

/* ... 主面板特有样式 ... */

.progress-container {
  width: 100%;
  background: rgba(0,255,255,0.1);
  height: 1.2rem;
  position: relative;
}

.progress-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(to right, #0ff, #0f0);
  transition: width 0.3s ease;
}

.progress-text {
  position: relative;
  z-index: 1;
  color: #000;
  padding: 0 0.5rem;
  font-size: 0.8em;
}
</style> 