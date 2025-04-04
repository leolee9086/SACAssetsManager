<template>
    <div class="magi-container neon-scroll">
        <div class="magi-layout">
            <!-- 左侧 MAGI 单元区域 -->
            <div v-show="showSeels" class="magi-grid" :class="{ 'trinity-active': showTrinity }">
                <div v-for="(seel, index) in seels.filter(s => s.config.name !== 'TRINITY-00')" :key="seel.name"
                    class="seel-row">
                    <!-- 状态容器 -->
                    <div class="status-container" :class="{ 'status-left': (index + 1) % 2 !== 0 }">
                        <!-- 预留状态显示区域 -->
                    </div>

                    <!-- AI面板 -->
                    <SeelPanel :ai="seel" :show-messages="showAllMessages" :class="[
                        'seel-panel-wrapper',
                        `panel-${index + 1}`,
                        { 'panel-left': (index + 1) % 2 !== 0 }
                    ]" :ref="(el) => seelPanelRefs[seel.config.name] = el" />
                </div>
            </div>

            <!-- Trinity 面板区域 -->
            <div v-show="showTrinity" class="trinity-column">
                <div class="status-container trinity-status-top">
                    <!-- 上方状态容器 -->
                </div>

                <SeelPanel v-if="trinityAI" :ai="trinityAI" :show-messages="showAllMessages"
                    class="trinity-panel-wrapper" ref="(el) => seelPanelRefs['TRINITY-00'] = el" />

                <div class="status-container trinity-status-bottom">
                    <!-- 下方状态容器 -->
                </div>
            </div>

            <div class="main-chat-area">


                <!-- 添加问卷组件 -->
                <Questionnaire v-if="showQuestionnaire" @close="showQuestionnaire = false" />

                <MagiMainPanel :messages="consensusMessages" :seels="seels" :show-seels="showSeels"
                    :show-trinity="showTrinity" :show-messages="showAllMessages" @toggle-messages="toggleAllMessages"
                    @toggle-seels="toggleSeels" @toggle-trinity="toggleTrinity"
                    @show-questionnaire="showQuestionnaire = true" />

                <!-- 添加加载按钮 -->
                <div class="questionnaire-button-container">
                    <input type="file" @change="loadPersonaConfig" ref="fileInput" style="display: none;" accept=".json" />
                    <button class="questionnaire-button" @click="$refs.fileInput.click()">加载人格配置</button>
                </div>

                <div class="input-wrapper">
                    <div class="global-input">
                        <textarea v-model="globalInput" @keydown.enter.exact.prevent="sendToAll" class="neon-input"
                            placeholder="输入指令..." />
                        <button @click="sendToAll" class="neon-button" :disabled="globalInput.trim() === ''">↵</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, provide, nextTick } from 'vue'
import SeelPanel from './components/SeelPanel.vue'
import MagiMainPanel from './components/MagiMainPanel.vue'
import { 处理流式消息, 创建消息,处理三贤人响应并转换Think标签 } from './utils/messageUtils.js'
import { 
    useMagi, 
    processSagesResponses,
    生成共识聊天回复 as generateConsensusResult, 
    handleTrinitySummary, 
    processVoting,
    
} from './composables/useMagi.js'
import Questionnaire from './components/persona/questionnaire.vue'

const { seels, connectionStatus, consensusMessages, initializeMAGI } = useMagi()

const globalInput = ref('')
const showAllMessages = ref(true)

const showSeels = ref(true)
const showTrinity = ref(false)
const trinityAI = computed(() => seels.find(s => s.config.name === 'TRINITY-00'))

const showQuestionnaire = ref(false)

onMounted(() => {
    initializeMAGI()
})

// 初始化后提供全局访问
provide('magi-system', seels)


const toggleAllMessages = () => {
    showAllMessages.value = !showAllMessages.value
    seels.forEach(seel => seel.showMessages = showAllMessages.value)
}
const sendToAll = async () => {
    try {
        const userMessage = globalInput.value.trim()
        if (!userMessage || connectionStatus.value !== 'connected') return
        globalInput.value = ''
        // 添加用户消息
        consensusMessages.push(创建消息('user', userMessage))
        // 获取三贤者的响应
        const sages = seels.filter(seel => seel.config.name !== 'TRINITY-00')
        const trinity = seels.find(seel => seel.config.name === 'TRINITY-00')
        // 拆分处理三贤者响应为独立函数
        const completedResponses = await processSagesResponses(sages, userMessage);
        console.log(completedResponses)
        // 过滤有效响应并转换 think 标签
        const validResponses = 处理三贤人响应并转换Think标签(completedResponses)
        // 存储崔尼蒂的总结结果
        let trinityResult = null
        if (validResponses.length > 0 && trinity) {
            // 调用封装的handleTrinitySummary方法
            trinityResult = await handleTrinitySummary(
                validResponses,  // 有效响应列表
                trinity,         // 崔尼蒂实例
                userMessage      // 用户原始输入
            )
        } else {
            console.warn('Trinity总结跳过', {
                validResponsesCount: validResponses.length,
                trinityExists: !!trinity
            })
        }
        const updateProgress = (percent) => {
            consensusMessages.push({
                type: 'system',
                content: `交叉验证进度: ${percent}%`,
                status: 'default',
                progress: percent,
                timestamp: Date.now()
            })
        }
        let voteResults = await processVoting(sages, validResponses, updateProgress)
        const ConsensusResult = generateConsensusResult(
            validResponses,
            trinityResult,
            voteResults,
            sages.length
        )
        consensusMessages.push(ConsensusResult)
    } catch (error) {
        console.error('SSE处理失败:', error)
        consensusMessages.push(创建消息('error', `流式响应错误: ${error.message}`, {
            meta: {
                source: 'SSE Handler',
                errorCode: 'STREAM_ERR_001'
            }
        }))
    }
}


// 添加面板引用
const seelPanelRefs = ref({})

const toggleSeels = () => {
    showSeels.value = !showSeels.value
}

const toggleTrinity = () => {
    showTrinity.value = !showTrinity.value
}

const loadPersonaConfig = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
        const content = await file.text()
        const config = JSON.parse(content)
        
        if (!config.systemPrompts) {
            throw new Error('无效的人格配置文件')
        }

        // 存储到全局变量供初始化使用
        window.__loadedPrompts = config.systemPrompts

        // 重新初始化MAGI系统
        await initializeMAGI()
        
        consensusMessages.push(创建消息('system', '人格配置已热重载', {
            meta: { 
                source: 'System', 
                config: Object.keys(config.systemPrompts),
                // 添加空值检查
                debug: seels.value?.map(s => ({
                    name: s.config.name,
                    prompt: s.config.systemPromptForChat?.slice(0, 50) + '...'
                })) ?? []  // 当seels.value未定义时返回空数组
            }
        }))
    } catch (e) {
        consensusMessages.push(创建消息('error', `配置加载失败: ${e.message}`))
        console.error('人格配置加载错误:', e)
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
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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

.magi-layout {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    height: 100%;
    box-sizing: border-box;
}

.magi-grid {
    display: flex;
    flex-direction: column;
    width: calc(100% - var(--main-chat-width, 38.2%));
    /* 使用CSS变量动态计算 */
    min-width: 600px;
    gap: 0.8rem;
    height: 100%;
    overflow: hidden;
}

.seel-row {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 0.8rem;
    position: relative;
    transition: all 0.3s ease-in-out;
}

.seel-panel-wrapper {
    width: 47.2%;
    /* 使用黄金分割比例(√0.618 ≈ 0.786 → 78.6% / 1.666) */
    min-height: 147%;
    margin: auto 0;
    /* 垂直方向自动外边距 */
}

.status-container {
    flex: 1;
    height: 100%;
}

/* 当不显示Trinity时调整布局 */
.magi-grid:not(.trinity-active) {
    --panel-width: 47.2%;
    --main-chat-width: 52.8%;

    .seel-row {
        height: 33.33vh;
        /* 设置固定高度，确保有足够空间进行对齐 */
        display: flex;
        align-items: stretch;
        /* 修改为stretch以允许子元素自由对齐 */
    }

    /* 为不同面板设置对齐方式 */
    .panel-1 {
        top: 0
    }

    .panel-2 {
        top: -10%
    }

    .panel-3 {
        top: -20%
    }

    .seel-panel-wrapper {
        width: var(--panel-width);
        min-height: calc(var(--panel-width) * 1.618) !important;
        display: flex;
        /* 添加flex布局 */
    }

    :deep(.seel-panel) {
        min-height: 120% !important;
        /* 仅在非Trinity模式下应用固定高度 */
    }
}

/* Trinity激活时的样式 */
.trinity-active {
    width: 38.2%;

    .seel-row {
        flex-direction: column;
        min-height: 100px;
    }

    .seel-panel-wrapper {
        width: 100%;
        aspect-ratio: auto;
    }



    :deep(.seel-panel) {
        min-height: unset !important;
        /* 重置Trinity模式下的最小高度 */
        height: 100%;
    }
}

.trinity-column {
    width: 23.6%;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    height: 100%;
}

.trinity-panel-wrapper {
    flex: 1;
    min-height: 0;
}

.trinity-status-top,
.trinity-status-bottom {
    flex: 0.5;
    min-height: 0;
}

/* 自定义滚动条样式 */
.magi-grid::-webkit-scrollbar {
    width: 6px;
}

.magi-grid::-webkit-scrollbar-track {
    background: rgba(0, 255, 255, 0.05);
}

.magi-grid::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 3px;
}

.magi-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 255, 0.5);
}

/* 当Trinity激活时，修改子AI面板布局 */
.trinity-active .seel-row {
    flex-direction: column;
    height: auto;
}

.trinity-active .seel-panel-wrapper {
    width: 100%;
    order: 0;
}

.trinity-active .status-container {
    display: none;
}

/* 奇数行布局 */
.panel-left {
    order: -1;
    /* 将面板移到左侧 */
}

.status-left {
    order: 1;
    /* 将状态容器移到右侧 */
}

/* 确保面板内容正确显示 */
.seel-panel-wrapper :deep(.seel-panel) {
    height: 100%;
    width: 100%;
}

.main-chat-area {
    flex: 1;
    min-width: 400px;
    display: flex;
    flex-direction: column;
}

.input-wrapper {
    margin-top: auto;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
}

.global-input {
    display: flex;
    gap: 0.5rem;
}

/* 确保主聊天区域占满剩余空间 */
:deep(.triniti-panel) {
    flex: 1;
    min-height: 300px;
    display: flex;
    flex-direction: column;
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


/* EVA风格视觉设计 */
.magi-container {
    color: #0ff;
    font-family: 'MS Gothic', monospace;
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
    background: linear-gradient(to bottom,
            transparent 50%,
            rgba(0, 255, 255, 0.05) 51%,
            transparent 51%);
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
    background: linear-gradient(to bottom,
            transparent 50%,
            rgba(0, 255, 255, 0.05) 51%,
            transparent 51%);
    background-size: 100% 4px;
    animation: scanline 30s linear infinite;
    pointer-events: none;
}

@keyframes scanline {
    from {
        background-position: 0 0;
    }

    to {
        background-position: 0 100vh;
    }
}

/* 增强面板网格效果 */
.ai-panel {
    background:
        repeating-linear-gradient(45deg,
            rgba(0, 255, 255, 0.05),
            rgba(0, 255, 255, 0.05) 1px,
            transparent 1px,
            transparent 10px),
        rgba(0, 20, 20, 0.9);
}

/* 添加切换按钮的样式 */
.toggle-text {
    color: #0ff;
    font-family: 'MS Gothic', monospace;
    font-size: 0.8em;
    cursor: pointer;
    letter-spacing: 0.1em;
    transition: all 0.3s ease;
    opacity: 0.8;
    margin-right: 1rem;
    user-select: none;
}

.toggle-text:hover {
    opacity: 1;
    text-shadow: 0 0 5px #0ff;
}

.toggle-text.active {
    opacity: 1;
    text-shadow: 0 0 5px #0ff;
}

/* 添加白色边框类 */
.border-white {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.3) !important;
}

/* 调整崔尼蒂面板的扫描线效果 */
.trinity-panel-wrapper ::v-deep(.neon-scroll::after) {
    background: linear-gradient(to bottom,
            transparent 50%,
            rgba(255, 255, 255, 0.05) 51%,
            transparent 51%);
}

.questionnaire-button-container {
    display: flex;
    justify-content: center;
    padding: 1rem;
}

.questionnaire-button {
    background: rgba(0, 255, 255, 0.1);
    border: 1px solid #0ff;
    color: #0ff;
    padding: 0.8rem 1.5rem;
    font-size: 1.1em;
    transition: all 0.3s ease;
}

.questionnaire-button:hover {
    background: rgba(0, 255, 255, 0.2);
    text-shadow: 0 0 5px #0ff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}
</style>
