<template>
  <div class="magi-container neon-scroll">
    <div class="magi-grid">
      <SeelPanel
        v-for="seel in seels"
        :key="seel.name"
        :ai="seel"
        :show-messages="showAllMessages"
        ref="(el) => seelPanelRefs[seel.config.name] = el"
      />
    </div>

    <TrinitiPanel 
      :messages="consensusMessages" 
      :seels="seels"
      :show-messages="showAllMessages"
      @toggle-messages="toggleAllMessages"
    />

    <div class="input-wrapper">
      <div class="global-input">
        <textarea
          v-model="globalInput"
          @keydown.enter.exact.prevent="sendToAll"
          class="neon-input"
          placeholder="输入指令..."
        />
        <button 
          @click="sendToAll"
          class="neon-button"
          :disabled="globalInput.trim() === ''"
        >↵</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, provide, nextTick } from 'vue'
import SeelPanel from './components/SeelPanel.vue'
import TrinitiPanel from './components/TrinitiPanel.vue'
import { initMagi } from './core/mockMagi.js'

const globalInput = ref('')
const consensusMessages = reactive([])
const showAllMessages = ref(true)
const connectionStatus = ref('connecting')

const seels = reactive([])
const initializeMAGI = async () => {
  try {
    connectionStatus.value = 'connecting'
    const rawSeels = await initMagi({ 
      delay: 800,
      autoConnect: true
    })
    
    seels.push(...rawSeels.map(ai => ({
      config: {
        name: ai.config.name,
        displayName: ai.config.displayName,
        color: ai.config.color,
        icon: ai.config.icon,
        responseType: ai.config.responseType,
        persona: ai.config.persona
      },
      messages: reactive(ai.messages),
      get loading() {
        return ai.loading
      },
      set loading(value) {
        ai.loading = value
      },
      get connected() {
        return ai.connected
      },
      async reply(userInput) {
        return await ai.reply(userInput)
      },
      async voteFor(responses) {
        return await ai.voteFor(responses)
      }
    })))
    
    connectionStatus.value = 'connected'
    
    consensusMessages.push({
      type: 'system',
      content: 'MAGI系统初始化完成'
    })
  } catch (error) {
    connectionStatus.value = 'error'
    consensusMessages.push({
      type: 'error',
      content: '系统初始化失败：' + error.message
    })
  }
}

onMounted(() => {
  initializeMAGI()
})

// 初始化后提供全局访问
provide('magi-system', seels)

const generateResponse = (aiIndex) => {
  const responses = [
    "同步率400%...模式BLUE",
    "AT力场中和进度78%",
    "LCL溶液浓度稳定", 
    "插入栓深度进入安全阈值",
    "使徒核心定位中..."
  ]
  return responses[Math.floor(Math.random() * responses.length)]
}

const toggleAllMessages = () => {
  showAllMessages.value = !showAllMessages.value
  seels.forEach(seel => seel.showMessages = showAllMessages.value)
}

// 增强SSE响应验证
const isValidStream = (response) => {
  return response && 
    typeof response[Symbol.asyncIterator] === 'function' &&
    typeof response.next === 'function'
}

const sendToAll = async () => {
  try {
    const userMessage = globalInput.value.trim()
    if (!userMessage || connectionStatus.value !== 'connected') return
    
    globalInput.value = ''
    
    // 添加用户消息到主面板
    consensusMessages.push({
      type: 'user',
      content: userMessage,
      status: 'default',
      timestamp: Date.now()
    })

    // 重构响应处理逻辑
    const responsePromises = seels.map(async (seel) => {
      try {
        const response = await seel.reply(userMessage)
        if (!isValidStream(response)) return null

        // 创建暂存区避免直接操作消息数组
        const pendingMsg = {
          id: Symbol('sseMsg'),
          type: 'sse_stream',
          content: '',
          status: 'pending',
          timestamp: Date.now(),
          meta: { progress: 0 },
          _lastFull: ''
        }

        let hasContent = false
        let finalContent = ''
        let receivedChunks = 0
        let lastFullContent = ''

        for await (const event of response) {
          const { type, data } = parseSSEEvent(event)
          
          // 增强首包验证逻辑
          receivedChunks++
          if (receivedChunks === 1) {
            // 扩展有效性判断标准
            const isValidFirstChunk = (
              (type === 'init' && (data.progress !== undefined || data.content)) ||  
              (type === 'chunk' && (data.content || data.progress !== undefined))
            )

            if (!isValidFirstChunk) {
              console.warn('首包验证失败', JSON.stringify({
                type,
                data,
                rawEvent: event, // 记录原始事件数据
                timestamp: Date.now(),
                ai: seel.config.name // 记录当前AI实例
              }, null, 2))
              
              seel.messages.push({
                type: 'error',
                content: `首包格式异常 [${type}]`,
                timestamp: Date.now(),
                meta: {
                  progress: data.progress,
                  eventType: type,
                  rawData: data
                }
              })
              return null
            }
            
            // 处理初始化信息
            if (data.progress !== undefined) {
              pendingMsg.meta.progress = data.progress
            }
          }

          // 延迟消息创建直到实际内容到达
          if (data.content?.trim() && !hasContent) {
            hasContent = true
            const validMsg = reactive({ 
              ...pendingMsg,
              status: 'loading',
              content: data.content
            })
            seel.messages.push(validMsg)
          }

          // 更新已提交的消息
          const targetMsg = seel.messages.find(m => m.id === pendingMsg.id)
          if (targetMsg) {
            // 修改内容拼接逻辑
            if (data._mode === 'delta') {
              // 仅追加新内容（去除可能重复的起始部分）
              const newContent = data.content.replace(targetMsg.content, '')
              targetMsg.content += newContent
            } else if (data._mode === 'full') {
              // 使用智能比对算法
              const diffStartIndex = findDiffIndex(lastFullContent, data.content)
              const newContent = data.content.slice(diffStartIndex)
              targetMsg.content += newContent
              lastFullContent = data.content
            }
            targetMsg.meta.progress = data.progress
            targetMsg.status = 'loading'
            targetMsg.timestamp = Date.now()
            finalContent = targetMsg.content
          }
        }

        // 最终状态处理
        if (hasContent) {
          const targetMsg = seel.messages.find(m => m.id === pendingMsg.id)
          if (targetMsg) {
            targetMsg.status = 'success'
            targetMsg.timestamp = Date.now()
            if (!finalContent.trim()) {
              seel.messages = seel.messages.filter(m => m !== targetMsg)
            }
          }
          return finalContent
        }
        return null
      } catch (e) {
        console.error('流处理异常:', e)
        return null
      }
    })

    // 过滤空响应
    const completedResponses = (await Promise.all(responsePromises))
      .filter(Boolean)

    // 过滤有效响应
    const validResponses = completedResponses
      .filter(response => response?.content)
      .map(response => response.content)

    // 添加系统消息
    consensusMessages.push({
      type: 'system',
      content: '开始交叉验证...',
      status: 'loading',
      timestamp: Date.now()
    })

    const updateProgress = (percent) => {
      consensusMessages.push({
        type: 'system',
        content: `交叉验证进度: ${percent}%`,
        status: 'default',
        progress: percent,
        timestamp: Date.now()
      })
    }

    // 修改投票循环
    const voteResults = []
    for (let i = 0; i < seels.length; i++) {
      const seel = seels[i]
      const progress = Math.floor((i / seels.length) * 100)
      updateProgress(progress)
      
      try {
        // 使用有效响应进行投票
        const voteResult = await seel.voteFor(validResponses)
        
        seel.messages.push({
          type: 'vote',
          content: '完成评估',
          status: 'success',
          meta: voteResult || {
            scores: [],
            conclusion: 'error'
          },
          timestamp: Date.now()
        })
        
        voteResults.push(voteResult)
      } catch (error) {
        console.error(`AI ${seel.config.displayName} 投票错误:`, error)
        seel.messages.push({
          type: 'error',
          content: '评估失败',
          status: 'error',
          timestamp: Date.now()
        })
      }
    }

    // 修改加权结果计算
    const weightedResults = validResponses
      .map((content, index) => ({
        content,
        weight: voteResults
          .filter(v => v?.scores)
          .reduce((acc, cur) => acc + (cur.scores[index]?.score || 0), 0) / seels.length
      }))
      .sort((a, b) => b.weight - a.weight)

    consensusMessages.push({
      type: 'consensus',
      content: weightedResults[0]?.content || '未达成共识',
      status: 'success',
      meta: {
        weights: weightedResults.map(w => w.weight),
        details: weightedResults
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('SSE处理失败:', error)
    consensusMessages.push({
      type: 'error',
      content: `[${new Date().toLocaleTimeString()}] 流式响应错误: ${error.message}`,
      status: 'error',
      timestamp: Date.now(),
      meta: {
        source: 'SSE Handler',
        errorCode: 'STREAM_ERR_001'
      }
    })
  }
}

// 添加差异比对函数
const findDiffIndex = (prev, current) => {
  const minLength = Math.min(prev.length, current.length)
  for (let i = 0; i < minLength; i++) {
    if (prev[i] !== current[i]) return i
  }
  return minLength
}

// 增强事件解析
const parseSSEEvent = (rawEvent) => {
  const lines = rawEvent.split('\n').filter(l => l.trim())
  let type = 'chunk'
  let data = {}
  
  lines.forEach(line => {
    if (line.startsWith('event:')) type = line.replace('event:', '').trim()
    if (line.startsWith('data:')) {
      try {
        data = JSON.parse(line.replace('data:', '').trim())
      } catch(e) {
        console.error('SSE数据解析失败:', e)
      }
    }
  })

  // 自动检测内容模式
  const isDeltaMode = data.choices?.[0]?.delta?.content !== undefined
  const isFullMode = data.choices?.[0]?.message?.content !== undefined || 
                    (data.content && data._isFull) // 兼容自定义标记

  return {
    type,
    data: {
      // 兼容两种数据格式
      content: isDeltaMode 
        ? data.choices[0].delta.content || ''
        : isFullMode
          ? data.choices[0].message.content || ''
          : data.content || '',
      progress: data.progress || 0,
      // 添加模式标记
      _mode: isDeltaMode ? 'delta' : isFullMode ? 'full' : 'unknown',
      _isFull: !!data.isFull // 显式标记全量模式
    }
  }
}

// 添加面板引用
const seelPanelRefs = ref({})
</script>

<style scoped>
/* 添加字体声明 */
@font-face {
  font-family: 'EVA-Matisse';
  src: 
    url('/fonts/EVA-Matisse-Classic.woff2') format('woff2'),
    url('/fonts/EVA-Matisse-Standard.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
}

@font-face {
  font-family: 'SourceHanSerif';
  src: url('https://cdn.jsdelivr.net/npm/source-han-serif@2.0/source-han-serif-sc-heavy.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
}

/* 应用字体到界面元素 */
.magi-container {
  font-family: 'EVA-Matisse', 'SourceHanSerif', sans-serif;
  position: relative;
  background: 
    linear-gradient(to right, rgba(0, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(45deg, rgba(0, 0, 0, 0.8), rgba(0, 30, 30, 0.9));
  background-size: 20px 20px;
}

.neon-text {
  font-family: 'EVA-Matisse', sans-serif;
  font-weight: 900;
}

/* 系统消息使用思源宋体 */
.message-bubble[type="system"] {
  font-family: 'SourceHanSerif', serif;
  font-weight: 900;
}

/* 控制台数字字体 */
.status-code {
  font-family: 'EVA-Matisse', monospace;
}

.magi-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.magi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  padding: 1rem;
  height: 35vh;
}

.main-output {
  flex: 1;
  margin: 1rem;
  background: 
    linear-gradient(0deg, 
      rgba(0, 255, 255, 0.05) 1px, 
      transparent 1px
    ),
    linear-gradient(90deg, 
      rgba(0, 255, 255, 0.05) 1px, 
      transparent 1px
    ),
    rgba(0, 30, 30, 0.9);
  background-size: 15px 15px;
  border: 2px solid #0f0;
  box-shadow: 0 0 15px #0f0;
  min-height: 50vh;
}

.ai-panel {
  height: 100%;
  background: 
    repeating-linear-gradient(
      45deg,
      rgba(0, 255, 255, 0.05),
      rgba(0, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 10px
    ),
    rgba(0, 20, 20, 0.9);
  border-width: 3px;
  transform: scale(0.95);
  transform-origin: top;
}

.secondary-output {
  max-height: 25vh;
  font-size: 0.85em;
  padding: 0.5rem;
}

.input-wrapper {
  padding: 1rem;
  background: #001010;
  border-top: 2px solid #0ff;
  box-shadow: 0 -5px 15px rgba(0, 255, 255, 0.1);
}

.global-input {
  max-width: 800px;
  margin: 0 auto;
}

/* EVA风格调整 */
.panel-header {
  background: linear-gradient(to right, 
    rgba(0, 0, 0, 0.8), 
    rgba(0, 50, 50, 0.5),
    rgba(0, 0, 0, 0.8));
  padding: 0.8rem;
  border-bottom: 1px solid currentColor;
}

.neon-text {
  text-shadow: 0 0 10px currentColor;
}

.border-red { color: #ff3366; }
.border-blue { color: #33ccff; }
.border-yellow { color: #ffcc00; }

/* EVA风格视觉设计 */
.magi-container {
  background: #001a1a;
  color: #0ff;
  font-family: 'MS Gothic', monospace;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  margin: 1rem 0;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1rem;
  background: rgba(0, 0, 0, 0.5);
}

.message-bubble {
  margin: 0.3rem 0;
  padding: 0.6rem;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #0ff;
  position: relative;
}

.ai-response {
  background: rgba(255, 0, 255, 0.1);
  border-color: #f0f;
}

.neon-input {
  background: transparent;
  border: 1px solid #0ff;
  color: #0ff;
  padding: 0.5rem;
  width: 100%;
}

.neon-button {
  background: #002;
  border: 1px solid #0ff;
  color: #0ff;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.neon-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 扫描线效果 */
.neon-scroll {
  position: relative;
  overflow: hidden;
}

.neon-scroll::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 255, 255, 0.05) 51%,
    transparent 51%
  );
  background-size: 100% 4px;
  pointer-events: none;
}

/* 添加动态扫描线效果 */
.magi-container::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 255, 255, 0.05) 51%,
    transparent 51%
  );
  background-size: 100% 4px;
  animation: scanline 30s linear infinite;
  pointer-events: none;
}

@keyframes scanline {
  from { background-position: 0 0; }
  to { background-position: 0 100vh; }
}

/* 增强面板网格效果 */
.ai-panel {
  background: 
    repeating-linear-gradient(
      45deg,
      rgba(0, 255, 255, 0.05),
      rgba(0, 255, 255, 0.05) 1px,
      transparent 1px,
      transparent 10px
    ),
    rgba(0, 20, 20, 0.9);
}

/* 主面板添加电路板纹理 */
.main-output {
  background: 
    linear-gradient(0deg, 
      rgba(0, 255, 255, 0.05) 1px, 
      transparent 1px
    ),
    linear-gradient(90deg, 
      rgba(0, 255, 255, 0.05) 1px, 
      transparent 1px
    ),
    rgba(0, 30, 30, 0.9);
  background-size: 15px 15px;
}
</style>
