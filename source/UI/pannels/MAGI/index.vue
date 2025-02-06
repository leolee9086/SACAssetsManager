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
                <MagiMainPanel :messages="consensusMessages" :seels="seels" :show-seels="showSeels"
                    :show-trinity="showTrinity" :show-messages="showAllMessages" @toggle-messages="toggleAllMessages"
                    @toggle-seels="toggleSeels" @toggle-trinity="toggleTrinity" />

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
import { initMagi, MockTrinity } from './core/mockMagi.js'

const globalInput = ref('')
const consensusMessages = reactive([])
const showAllMessages = ref(true)
const connectionStatus = ref('disconnected')

const seels = reactive([])
const showSeels = ref(true)
const showTrinity = ref(false)
const trinityAI = computed(() => seels.find(s => s.config.name === 'TRINITY-00'))

const initializeMAGI = async () => {
    try {
        connectionStatus.value = 'connecting'
        const rawSeels = await initMagi({
            delay: 800,
            autoConnect: true
        })

        // 添加三贤者
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
            loading: false,
            connected: true,
            async reply(userInput) {
                return await ai.reply(userInput)
            },
            async voteFor(responses) {
                return await ai.voteFor(responses)
            }
        })))

        // 添加崔尼蒂
        const trinity = new MockTrinity()
        seels.push({
            config: {
                name: trinity.config.name,
                displayName: trinity.config.displayName,
                color: 'rgba(255, 255, 255, 0.9)',
                icon: trinity.config.icon,
                responseType: trinity.config.responseType,
                persona: trinity.config.persona
            },
            messages: reactive([]),
            loading: false,
            connected: true,
            async reply(userInput, options) {
                return await trinity.reply(userInput, options)
            },
            // Trinity 不参与投票
            async voteFor() {
                return null
            }
        })

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

        // 获取三贤者的响应
        const sages = seels.filter(seel => seel.config.name !== 'TRINITY-00')
        const trinity = seels.find(seel => seel.config.name === 'TRINITY-00')

        // 首先获取三贤者的响应
        const responsePromises = sages.map(async (seel) => {
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
                    return {
                        content: finalContent,
                        seel: seel.config.name
                    }
                }
                return null
            } catch (e) {
                console.error('流处理异常:', e)
                return null
            }
        })

        // 等待所有三贤者响应完成
        const completedResponses = (await Promise.all(responsePromises))
            .filter(Boolean)

        // 过滤有效响应
        const validResponses = completedResponses
            .filter(response => response?.content)
            .map(response => ({
                seel: response.seel,  // 携带AI标识
                content: response.content,
                displayName: seels.find(s => s.config.name === response.seel)?.config.displayName // 携带显示名称
            }))

        // 存储崔尼蒂的总结结果
        let trinityResult = null

        // 确保有足够的有效响应并且Trinity存在
        if (validResponses.length > 0 && trinity) {
            console.log('开始Trinity总结', {
                responses: validResponses.map(r => ({
                    seel: r.seel,
                    contentLength: r.content.length
                }))
            })

            try {
                // 准备Trinity的上下文
                const trinityContext = {
                    context: {
                        responses: validResponses  // 直接传递完整响应对象
                    }
                }
                console.log(trinityContext)
                // 发起Trinity的响应请求
                const trinityResponse = await trinity.reply(userMessage, trinityContext)

                if (isValidStream(trinityResponse)) {
                    // 清理旧消息
                    const lastMsg = trinity.messages[trinity.messages.length - 1]
                    if (lastMsg?.type === 'assistant') {
                        trinity.messages.pop()
                    }

                    let trinityContent = ''
                    for await (const event of trinityResponse) {
                        const { data } = parseSSEEvent(event)
                        if (data.content) {
                            trinityContent += data.content
                            // 更新或创建消息
                            if (!trinity.messages.length || trinity.messages[trinity.messages.length - 1].type !== 'assistant') {
                                trinity.messages.push({
                                    type: 'assistant',
                                    content: trinityContent,
                                    status: 'loading',
                                    timestamp: Date.now()
                                })
                            } else {
                                trinity.messages[trinity.messages.length - 1].content = trinityContent
                            }
                        }
                    }

                    // 保存崔尼蒂的最终结果
                    if (trinity.messages.length > 0) {
                        const lastMessage = trinity.messages[trinity.messages.length - 1]
                        lastMessage.status = 'success'
                        lastMessage.timestamp = Date.now()
                        trinityResult = lastMessage.content
                    }
                }
            } catch (error) {
                console.error('Trinity响应错误:', error)
                trinity.messages.push({
                    type: 'error',
                    content: '响应生成失败: ' + error.message,
                    status: 'error',
                    timestamp: Date.now()
                })
            }
        } else {
            console.warn('Trinity总结跳过', {
                validResponsesCount: validResponses.length,
                trinityExists: !!trinity
            })
        }

        // 继续原有的投票流程
        const updateProgress = (percent) => {
            consensusMessages.push({
                type: 'system',
                content: `交叉验证进度: ${percent}%`,
                status: 'default',
                progress: percent,
                timestamp: Date.now()
            })
        }

        // 修改投票循环（仅三贤者参与）
        const voteResults = []
        for (let i = 0; i < sages.length; i++) {
            const seel = sages[i]
            const progress = Math.floor((i / sages.length) * 100)
            updateProgress(progress)

            try {
                // 使用有效响应进行投票
                const voteResult = await seel.voteFor(validResponses.map(r => r.content))

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
                    .reduce((acc, cur) => acc + (cur.scores[index]?.score || 0), 0) / sages.length
            }))
            .sort((a, b) => b.weight - a.weight)

        // 修改最终结果显示逻辑
        consensusMessages.push({
            type: 'consensus',
            // 优先使用崔尼蒂的结果,如果没有则使用权重最高的结果
            content: trinityResult || (weightedResults[0]?.content || '未达成共识'),
            status: 'success',
            meta: {
                source: trinityResult ? 'trinity' : 'weighted',
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
            } catch (e) {
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

const toggleSeels = () => {
    showSeels.value = !showSeels.value
}

const toggleTrinity = () => {
    showTrinity.value = !showTrinity.value
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

.border-red {
    color: #ff3366;
}

.border-blue {
    color: #33ccff;
}

.border-yellow {
    color: #ffcc00;
}

/* EVA风格视觉设计 */
.magi-container {
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
</style>
