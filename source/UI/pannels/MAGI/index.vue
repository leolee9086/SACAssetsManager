<template>
  <div class="magi-container neon-scroll">
    <div class="magi-grid">
      <SeelPanel
        v-for="seel in seels"
        :key="seel.name"
        :ai="seel"
        :show-messages="showAllMessages"
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
import { ref, reactive, computed, onMounted, provide } from 'vue'
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

    // 第一阶段：收集AI响应
    const responsePromises = seels.map(async (seel, index) => {
      try {
        // 先显示加载状态
        const response = await seel.reply(userMessage)
        
        // 确保响应添加到对应AI的消息列表中
        if (response && response.content) {
          seel.messages.push({
            type: 'ai',
            content: response.content,
            status: 'success',
            timestamp: Date.now()
          })
        }
        
        return response
      } catch (error) {
        console.error(`AI ${seel.config.displayName} 响应错误:`, error)
        seel.messages.push({
          type: 'error',
          content: '响应失败',
          status: 'error',
          timestamp: Date.now()
        })
        throw error
      }
    })

    // 等待所有响应
    const firstStageResponses = await Promise.all(responsePromises)

    // 第二阶段：交叉验证
    consensusMessages.push({
      type: 'system',
      content: '开始交叉验证...',
      status: 'loading',
      timestamp: Date.now()
    })

    // 计算和显示验证进度
    const updateProgress = (percent) => {
      consensusMessages.push({
        type: 'system',
        content: `交叉验证进度: ${percent}%`,
        status: 'default',
        progress: percent,
        timestamp: Date.now()
      })
    }

    // 执行交叉验证
    const voteResults = []
    for (let i = 0; i < seels.length; i++) {
      const seel = seels[i]
      // 计算进度
      const progress = Math.floor((i / seels.length) * 100)
      updateProgress(progress)
      
      try {
        const voteResult = await seel.voteFor(
          firstStageResponses
            .filter(r => r && r.content)
            .map(r => r.content)
        )
        
        // 添加投票结果到AI消息列表
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

    // 更新最终进度
    updateProgress(100)

    // 计算权重和最终结果
    const weightedResults = firstStageResponses
      .map((response, index) => {
        const votes = voteResults
          .filter(v => v && v.scores && v.scores[index])
          .map(v => v.scores[index].score)
        
        const weight = votes.length > 0
          ? votes.reduce((a, b) => a + b, 0) / votes.length
          : 0

        return {
          content: response?.content || '无响应',
          weight: parseFloat(weight.toFixed(1))
        }
      })
      .sort((a, b) => b.weight - a.weight)

    // 添加最终决议
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
    console.error('处理错误:', error)
    consensusMessages.push({
      type: 'error',
      content: `系统错误: ${error.message}`,
      status: 'error',
      timestamp: Date.now()
    })
  }
}
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
