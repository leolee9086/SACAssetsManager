<template>
  <div ref="panelContainer" class="seel-panel" :style="rootStyle">
    <svg class="panel-frame" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern :id="`grid-${ai.config.name}`" width="20" height="20" patternUnits="userSpaceOnUse">
          <path :stroke="getColor(ai.config.color)" stroke-width="0.5" stroke-opacity="0.05" fill="none" 
                d="M 20 0 L 0 0 0 20"/>
        </pattern>
        <linearGradient :id="`bg-gradient-${ai.config.name}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color: rgba(0, 0, 0, 0.8)"/>
          <stop offset="50%" style="stop-color: rgba(0, 30, 30, 0.9)"/>
          <stop offset="100%" style="stop-color: rgba(0, 0, 0, 0.8)"/>
        </linearGradient>
        <clipPath :id="`panel-clip-${ai.config.name}`">
          <path d="M 5,0 H 95 L 100,5 V 95 L 95,100 H 5 L 0,95 V 5 Z"/>
        </clipPath>
      </defs>
      
      <rect x="0" y="0" width="100" height="100" 
            :fill="`url(#bg-gradient-${ai.config.name})`"
            :clip-path="`url(#panel-clip-${ai.config.name})`"/>
      
      <rect x="0" y="0" width="100" height="100" 
            :fill="`url(#grid-${ai.config.name})`"
            :clip-path="`url(#panel-clip-${ai.config.name})`"/>
      
      <path :stroke="getColor(ai.config.color)" stroke-width="1" fill="none"
            d="M 5,0 H 95 L 100,5 V 95 L 95,100 H 5 L 0,95 V 5 Z"/>
      
      <path :stroke="getColor(ai.config.color)" 
            stroke-width="1.5" 
            fill="none"
            stroke-opacity="0.8"
            d="M 94,0 L 100,6 M 0,6 L 6,0 M 0,94 L 6,100 M 94,100 L 100,94"/>
      
      <rect x="5" y="4" width="90" height="24" 
            :fill="`url(#header-gradient-${ai.config.name})`"
            :clip-path="`url(#panel-clip-${ai.config.name})`"/>
      
      <foreignObject x="5" y="4" width="90" height="24">
        <div xmlns="http://www.w3.org/1999/xhtml" class="header-content">
          <!-- 移除原有标题内容 -->
        </div>
      </foreignObject>
      
      <line x1="4" y1="16" x2="96" y2="16" 
            :stroke="getColor(ai.config.color)" 
            stroke-width="0.2" 
            stroke-opacity="0.3"/>
      
      <line x1="0" y1="28" x2="100" y2="28" 
            :stroke="getColor(ai.config.color)" 
            stroke-width="0.5" 
            stroke-opacity="0.3"/>
      
      <path :stroke="getColor(ai.config.color)" 
            stroke-width="0.5" 
            fill="none" 
            stroke-opacity="0.5"
            d="M 0,28 L 5,28 M 95,28 L 100,28"/>
    </svg>
    
    <!-- 调整后的标题层 -->
    <div class="header-overlay" :style="headerStyle">
      <div class="header-content">
        <div class="header-top">
          <div class="ai-id">
            <span class="ai-icon">{{ ai.config.icon }}</span>
            <span class="ai-name">{{ ai.config.name.split('-')[0] }}</span>
            <span class="ai-number">-{{ ai.config.name.split('-')[1] }}</span>
          </div>
          <div class="status-indicator">
            <span class="status-led" :class="statusClass"></span>
            <span class="status-text">{{ statusText }}</span>
          </div>
        </div>
        <div class="header-bottom">
          <span class="ai-role">{{ ai.config.persona }}</span>
        </div>
      </div>
    </div>

    <div class="panel-content">
      <transition name="panel-slide">
        <div v-show="showMessages" class="message-container secondary-output">
          <MessageBubble
            v-for="msg in ai.messages"
            :key="msg.id"
            :type="msg.type"
            :status="msg.status"
            :timestamp="msg.timestamp"
          >
            <template #default>
              <template v-if="msg.type === 'vote'">
                <div class="vote-header">
                  <span class="vote-timestamp">VOTE FOR {{ formatVoteTime(msg.timestamp) }}</span>
                  <span class="vote-conclusion" :class="conclusionClass">
                    {{ formattedConclusion }}
                  </span>
                </div>
                <div class="vote-meta">
                  <div class="score-item" v-for="(score, idx) in msg?.meta?.scores" :key="idx">
                    <div class="target-info">
                      <span class="seel-index">{{String(idx+1).padStart(2, '0')}}</span>
                      <div class="seel-details">
                        <div class="seel-name">{{ getSeelName(score.targetIndex) }}</div>
                        <div class="seel-role">{{ getSeelRole(score.targetIndex) }}</div>
                      </div>
                    </div>
                    <div class="score-bar">
                      <div class="score-fill" :style="{ width: `${score.score * 10}%` }"></div>
                      <span class="score-value">{{ score.score }}</span>
                    </div>
                    <span class="decision" :class="decisionClass(score.decision)">
                      {{ score.decision || '待定' }}
                    </span>
                  </div>
                </div>
              </template>
              <template v-else-if="msg.type === 'sse_stream'">
                <div class="sse-stream" 
                     v-if="msg.status !== 'pending' && (msg.content.trim() || msg.status === 'loading')">
                  <span class="stream-content">{{ msg.content || '处理中...' }}</span>
                  <span 
                    v-if="msg.status === 'loading'"
                    class="stream-cursor"
                    :style="{ color: `var(--${ai.config.color}-color)` }"
                  >▊</span>
                </div>
              </template>
              <template v-else>
                {{ msg.content }}
              </template>
            </template>
          </MessageBubble>
          <div v-if="ai.loading" class="loading-animation">
            <div class="pulse-dot"></div>
            <div class="pulse-bar"></div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref, defineExpose, onMounted, onUnmounted } from 'vue'
import MessageBubble from './MessageBubble.vue'
import { Vue } from 'vue'

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

const safeMeta = computed(() => props.msg?.meta || {})
const safeConclusion = computed(() => safeMeta.value.conclusion || '评估未完成')
const formattedConclusion = computed(() => {
  if (safeConclusion.value === 'pending') return '评估进行中'
  if (safeConclusion.value === 'error') return '评估异常'
  return safeConclusion.value
})

const conclusionClass = computed(() => ({
  'conclusion-pass': safeConclusion.value === '通过',
  'conclusion-reject': safeConclusion.value === '否决',
  'conclusion-pending': !safeMeta.value.conclusion
}))

const displayName = computed(() => 
  props.ai?.config?.displayName || '未知AI'
)

const systemInfo = computed(() => ({
  name: props.ai?.config?.name || 'SYSTEM_ID',
  persona: props.ai?.config?.persona || '基础人格'
}))

// 注入seels列表
const seels = inject('magi-system', [])

const getSeelName = (index) => {
  return seels[index]?.config.displayName || `MAGI-${index + 1}`
}

const getSeelRole = (index) => {
  return seels[index]?.config.persona || 'UNKNOWN PROTOCOL'
}

// 新增决策状态分类方法
const decisionClass = (decision) => {
  return {
    'text-green': decision === '通过',
    'text-red': decision === '否决',
    'text-yellow': decision === '复议'
  }
}

// 新增时间格式化方法
const formatVoteTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

// 增强流式更新处理
const handleStreamUpdate = (chunk) => {
  const lastMsg = props.ai.messages[props.ai.messages.length - 1]
  if (!lastMsg || lastMsg.type !== 'sse_stream') return
  
  // 使用Vue.set确保响应式
  Vue.set(lastMsg, 'content', (lastMsg.content || '') + chunk)
  Vue.set(lastMsg, 'timestamp', Date.now())
}

// 允许父组件访问
defineExpose({ handleStreamUpdate })

// 添加配置访问保护
const eventTypes = computed(() => {
  return props.ai.config.sseConfig?.eventTypes || ['init', 'chunk', 'complete']
})

// 添加颜色映射函数
const getColor = (colorName) => {
  const colorMap = {
    'red': '#ff3366',
    'blue': '#33ccff',
    'yellow': '#ffcc00'
  }
  return colorMap[colorName] || '#33ccff' // 默认使用蓝色
}

// 添加容器引用
const panelContainer = ref(null)
const containerHeight = ref(0)

// 添加尺寸观察器
const resizeObserver = new ResizeObserver(entries => {
  if (entries[0]) {
    containerHeight.value = entries[0].contentRect.height
  }
})

onMounted(() => {
  if (panelContainer.value) {
    resizeObserver.observe(panelContainer.value)
  }
})

onUnmounted(() => {
  resizeObserver.disconnect()
})

// 修改单位转换函数
const svgToPixels = (svgUnits) => {
  return svgUnits * (containerHeight.value / 100) // 根据实际容器高度计算
}

// 更新计算属性
const headerHeight = computed(() => svgToPixels(28))
const contentHeight = computed(() => svgToPixels(72))

// 在模板根元素上绑定样式
const rootStyle = computed(() => ({
  '--header-height': `${headerHeight.value}px`,
  '--content-height': `${contentHeight.value}px`
}))

// 新增标题层样式
const headerStyle = computed(() => ({
  '--header-height': `${headerHeight.value}px`,
  '--content-height': `${contentHeight.value}px`
}))
</script>

<style scoped>
:root {
  --red-color: #ff3366;
  --blue-color: #33ccff;
  --yellow-color: #ffcc00;
}

.seel-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  transform: scale(0.95);
  transform-origin: top;
}

.panel-frame {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}

.panel-content {
  position: relative;
  z-index: 2;
  height: calc(var(--content-height)); 
  margin-top: calc(var(--header-height)); 
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 24px;
  margin-top: 4px;
  font-family: 'MS Gothic', monospace;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 1.8em; /* 使用固定em高度 */
  margin-bottom: 0.3em; /* 使用margin替代行高 */
}

.header-bottom {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 1.8em; /* 使用固定em高度 */
  margin-top: 0.3em; /* 使用margin替代行高 */
}

.ai-id {
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.ai-icon {
  margin-right: 0.3rem;
  font-size: 0.8em;
  opacity: 0.9;
}

.ai-name {
  color: inherit;
  opacity: 0.9;
  font-weight: bold;
  font-size: 0.7em;
}

.ai-number {
  color: inherit;
  opacity: 0.7;
  font-size: 0.6em;
}

.ai-role {
  font-size: 0.6em;
  opacity: 0.9;
  letter-spacing: 0.03em;
  font-weight: bold;
  text-transform: uppercase;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.3em; /* 使用gap控制间距 */
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
  font-size: 1.1em;
  opacity: 0.8;
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

.conclusion-pass {
  color: #0f0;
  border-left: 3px solid #0f0;
  padding-left: 0.5rem;
}

.conclusion-reject {
  color: #f00;
  border-left: 3px solid #f00;
  padding-left: 0.5rem;
}

.conclusion-pending {
  color: #ff0;
  border-left: 3px solid #ff0;
  padding-left: 0.5rem;
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

.message-container {
  flex: 1;
  min-height: 0;
  max-height: calc(100% - 2%); /* 保留操作余量 */
  overflow-y: auto;
  padding: 0.5rem;
  margin: 0 4% 4%; /* 左右边距对应SVG的x="5"位置 */
  background: rgba(0, 0, 0, 0.3);
}

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

.target-info {
  display: flex;
  align-items: center;
  min-width: 120px;
}

.seel-index {
  font-size: 1.2em;
  margin-right: 0.5rem;
  color: #0ff;
}

.seel-details {
  display: flex;
  flex-direction: column;
  justify-content: center; /* 使用flex对齐替代行高 */
  margin-left: 0.3em;
}

.seel-name {
  font-size: 0.9em;
  font-weight: bold;
}

.seel-role {
  font-size: 0.7em;
  opacity: 0.8;
  text-transform: uppercase;
}

.vote-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.8em;
  opacity: 0.7;
}

.vote-timestamp::before {
  content: "⌚ ";
  margin-right: 0.3em;
}

.vote-conclusion {
  color: #0ff;
}

.sse-stream {
  font-family: 'MS Gothic', monospace;
  white-space: pre-wrap;
}

.stream-cursor {
  color: var(--${ai.config.color}-color);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.header-content {
  font-size: clamp(10px, 1.6vh, 16px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.2rem 0; /* 使用padding替代行高 */
}

.panel-content::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(to bottom, 
    transparent, 
    rgba(0,0,0,0.8) 80%
  );
  pointer-events: none;
}

/* 添加动态高度适配 */
@media (max-height: 600px) {
  .panel-content {
    margin-top: calc(var(--header-height) * 0.8);
    height: calc(var(--content-height) * 1.2);
  }
}

/* 新增标题层样式 */
.header-overlay {
  position: absolute;
  z-index: 3; /* 高于SVG层 */
  top: 4%;
  left: 5%;
  width: 90%;
  height: 26%;
  pointer-events: none;
}

/* 调整原有样式 */
.ai-name {
  font-size: 1.2em;
}

.ai-number {
  font-size: 0.9em;
}

.ai-role {
  font-size: 1.1em;
}

.status-text {
  font-size: 1.1em;
}

/* 移除原foreignObject中的header-content样式 */
</style> 