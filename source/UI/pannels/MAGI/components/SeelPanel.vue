<template>
  <div class="seel-panel" :class="`border-${ai.config.color}`">
    <div class="panel-header">
      <div class="header-left">
        <span class="pulse-icon" :style="{ textShadow: `0 0 8px var(--${ai.config.color}-color)` }">
          {{ ai.config.icon }}
        </span>
        <div class="name-container">
          <h3 class="neon-text">{{ ai.config.displayName }}</h3>
          <div class="system-info">
            <span class="system-id">{{ ai.config.name }}</span>
            <span class="separator">|</span>
            <span class="persona-name">{{ ai.config.persona }}</span>
          </div>
        </div>
      </div>
      <div class="status-indicator">
        <span class="status-led" :class="statusClass"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <transition name="panel-slide">
      <div v-show="showMessages" class="message-container secondary-output">
        <MessageBubble
          v-for="(msg, i) in ai.messages"
          :key="`msg-${i}`"
          :type="msg.type === 'vote' ? 'vote' : msg.type"
          :status="msg.status || 'default'"
          :timestamp="msg.timestamp"
        >
          <template v-if="msg.type === 'vote'">
            <div class="vote-meta">
              <span class="conclusion">{{ msg.meta?.conclusion || '未达成结论' }}</span>
              <div v-for="(score, idx) in msg.meta?.scores" :key="idx" class="score-item">
                <span class="target">{{ score.target }}</span>
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: `${score.score * 10}%` }"></div>
                  <span class="score-value">{{ score.score }}</span>
                </div>
                <span class="comment">{{ score.comment }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            {{ msg.content }}
          </template>
        </MessageBubble>
        <div v-if="ai.loading" class="loading-animation">
          <div class="pulse-dot"></div>
          <div class="pulse-bar"></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  ai: {
    type: Object,
    required: true
  },
  showMessages: {
    type: Boolean,
    default: true
  }
})

const statusClass = computed(() => {
  if (!props.ai.connected) return 'offline'
  if (props.ai.loading) return 'loading'
  return 'online'
})

const statusText = computed(() => {
  if (!props.ai.connected) return '未连接'
  if (props.ai.loading) return '同步中'
  return '已连接'
})

const safeMeta = computed(() => props.msg.meta || {})
const safeConclusion = computed(() => safeMeta.value.conclusion || '未知')
const safeScores = computed(() => safeMeta.value.scores || [])
const safeWeight = computed(() => (safeMeta.value.weight || 0).toFixed(1))
const hasError = computed(() => safeMeta.value.error)
const errorMessage = computed(() => safeMeta.value.message || '未知错误')
const hasScores = computed(() => safeScores.value.length > 0)

const conclusionClass = computed(() => {
  return {
    'pass': safeConclusion.value === '通过',
    'reject': safeConclusion.value === '否决',
    'review': safeConclusion.value === '复议'
  }
})

const displayName = computed(() => 
  props.ai?.config?.displayName || '未知AI'
)

const systemInfo = computed(() => ({
  name: props.ai?.config?.name || 'SYSTEM_ID',
  persona: props.ai?.config?.persona || '基础人格'
}))
</script>

<style scoped>
:root {
  --red-color: #ff3366;
  --blue-color: #33ccff;
  --yellow-color: #ffcc00;
}

.seel-panel {
  height: 400px; /* 固定面板高度 */
  display: flex;
  flex-direction: column;
  background: rgba(0, 20, 20, 0.9);
  border: 3px solid;
  transform: scale(0.95);
  transform-origin: top;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background: linear-gradient(to right, 
    rgba(0, 0, 0, 0.8), 
    rgba(0, 50, 50, 0.5),
    rgba(0, 0, 0, 0.8)
  );
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.name-container {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.system-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7em;
  opacity: 0.8;
  font-family: 'Courier New', monospace;
}

.separator {
  color: currentColor;
  opacity: 0.5;
}

.system-id, .persona-name {
  color: inherit;
}

.neon-text {
  margin: 0;
  font-size: 1.1em;
  line-height: 1;
}

.pulse-icon {
  font-size: 1.2em;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-led.online {
  background: #0f0;
  box-shadow: 0 0 5px #0f0;
  animation: pulse 1.5s infinite;
}

.status-led.loading {
  background: #ff0;
  box-shadow: 0 0 5px #ff0;
  animation: pulse 0.8s infinite;
}

.status-led.offline {
  background: #f00;
  box-shadow: 0 0 5px #f00;
}

.status-text {
  font-size: 0.8em;
  opacity: 0.8;
}

.border-red { 
  border-color: var(--red-color);
  color: var(--red-color);
}

.border-blue { 
  border-color: var(--blue-color);
  color: var(--blue-color);
}

.border-yellow { 
  border-color: var(--yellow-color);
  color: var(--yellow-color);
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.text-red {
  color: var(--red-color);
}

.text-blue {
  color: var(--blue-color);
}

.text-yellow {
  color: var(--yellow-color);
}

/* 新增投票结论样式 */
.conclusion-通过 {
  color: #0f0;
  border-left: 3px solid #0f0;
}

.conclusion-复议 {
  color: #ff0;
  border-left: 3px solid #ff0;
}

.conclusion-否决 {
  color: #f00;
  border-left: 3px solid #f00;
}

.score-bar {
  flex: 1;
  height: 20px;
  background: rgba(255,255,255,0.1);
  position: relative;
  margin: 0 1rem;
}

.score-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(to right, #0ff, #0f0);
}

.score-value {
  position: relative;
  z-index: 1;
  padding: 0 0.5rem;
}

.vote-error {
  color: #f00;
  margin-left: 1rem;
}

/* 其他样式保持不变... */

.message-container {
  flex: 1;
  min-height: 0; /* 关键：允许内容收缩 */
  max-height: calc(100% - 50px); /* 减去标题栏高度 */
  overflow-y: auto;
  padding: 0.5rem;
}

/* 同步TrinitiPanel的滚动条样式 */
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

/* 调整投票消息容器高度 */
.vote-meta {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.conclusion {
  font-weight: bold;
  color: #0ff;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.target {
  min-width: 60px;
  opacity: 0.7;
}

.score-bar {
  flex: 1;
  height: 20px;
  background: rgba(255,255,255,0.1);
  position: relative;
}

.score-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(to right, #0ff, #0f0);
}

.score-value {
  position: relative;
  z-index: 1;
  padding: 0 0.5rem;
  font-size: 0.8em;
}

.comment {
  font-size: 0.8em;
  opacity: 0.7;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loading-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pulse-dot, .pulse-bar {
  width: 10px;
  height: 10px;
  background: #0ff;
  border-radius: 50%;
  margin: 0 0.2rem;
  animation: pulse 0.8s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style> 