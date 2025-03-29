import { ref, reactive, watch } from '../../../../../static/vue.esm-browser.js'
import { initMagi, MockTrinity } from '../core/mockMagi.js'
import { 处理流式消息 ,创建消息} from '../utils/messageUtils.js'
import { AISSEConversation } from '../../../../../src/toolBox/feature/useOpenAI/useOpenAISSE.js'

export function useMagi() {
    const seels = reactive([])
    const connectionStatus = ref('disconnected')
    const consensusMessages = reactive([])

    
    const initializeMAGI = async () => {
        try {
            connectionStatus.value = 'connecting'
            
            // 清空现有AI实例
            seels.splice(0, seels.length)
            consensusMessages.splice(0, consensusMessages.length)

            // 添加配置项
            const config = {
                delay: 800,
                autoConnect: true,
                prompts: window.__loadedPrompts,
                memorySize: 7, // 添加默认记忆长度
                openAIConfig: {
                    // ... 现有的openAI配置 ...
                }
            }

            const rawSeels = await initMagi(config)

            // 重新创建所有AI实例
            const newSeels = rawSeels.map(ai => {
                // 保持原始AI实例的引用
                const wrappedAI = {
                    _originalAI: ai,  // 保存原始AI实例
                    config: {
                        name: ai.config.name,
                        displayName: ai.config.displayName,
                        color: ai.config.color,
                        icon: ai.config.icon,
                        responseType: ai.config.responseType,
                        persona: ai.config.persona,
                        memorySize: ai.config.memorySize  // 添加记忆配置
                    },
                    messages: reactive(ai.messages),
                    loading: false,
                    connected: true,
                    async reply(userInput) {
                        // 确保消息同步
                        this._originalAI.messages = this.messages;
                        return await this._originalAI.reply(userInput);
                    },
                    async voteFor(responses) {
                        return await this._originalAI.voteFor(responses);
                    }
                };

                // 设置消息监听
                watch(() => wrappedAI.messages, (newMessages) => {
                    wrappedAI._originalAI.messages = newMessages;
                }, { deep: true });

                return wrappedAI;
            })
            
            // 修改崔尼蒂实例创建方式
            const trinityInstance = rawSeels.find(s => s.config.name === 'TRINITY-00')
            if (!trinityInstance) {
                const trinity = new MockTrinity(null, window.__loadedPrompts?.trinity)
                const wrappedTrinity = {
                    _originalAI: trinity,
                    config: {
                        name: trinity.config.name,
                        displayName: trinity.config.displayName,
                        color: 'rgba(255, 255, 255, 0.9)',
                        icon: trinity.config.icon,
                        responseType: trinity.config.responseType,
                        persona: trinity.config.persona,
                        memorySize: trinity.config.memorySize,  // 添加记忆配置
                        systemPromptForChat: window.__loadedPrompts?.trinity || trinity.config.systemPromptForChat
                    },
                    messages: reactive([]),
                    loading: false,
                    connected: true,
                    async reply(userInput, options) {
                        this._originalAI.messages = this.messages;
                        return await this._originalAI.reply(userInput, options);
                    },
                    async voteFor() {
                        return null;
                    }
                };

                // 设置消息监听
                watch(() => wrappedTrinity.messages, (newMessages) => {
                    wrappedTrinity._originalAI.messages = newMessages;
                }, { deep: true });

                newSeels.push(wrappedTrinity)
            }

            seels.push(...newSeels)
            
            connectionStatus.value = 'connected'
            consensusMessages.push({
                type: 'system',
                content: 'MAGI系统初始化完成'
            })
        } catch (error) {
            connectionStatus.value = 'error'
            consensusMessages.push({
                type: 'error',
                content: '系统初始化失败：' + error.message +"\n" + error.stack
            })
        }
    }

    return {
        seels,
        connectionStatus,
        consensusMessages,
        initializeMAGI
    }
} 

export const  processSagesResponses = async (sages, userMessage, difficulty) => {
    // 根据难度值调整请求参数
    const requestConfig = difficulty > 70 ? { 
        model: 'deep-think',
        maxTokens: 2000
    } : {
        model: 'fast',
        maxTokens: 800
    }

    const responsePromises = sages.map(async (seel) => {
        try {
            // 确保消息同步
            if (seel._originalAI) {
                seel._originalAI.messages = seel.messages;
            }

            const response = await seel.reply(userMessage)
            const { content, success } = await 处理流式消息(response, {
                onStart: (msg) => {
                    seel.loading = true
                    // 添加用户消息到历史
                    seel.messages.push(创建消息('user', userMessage));
                },
                onChunk: (msg) => {
                    const existingMsg = seel.messages.find(m => m.id === msg.id)
                    if (existingMsg) {
                        Object.assign(existingMsg, msg)
                    } else {
                        seel.messages.push({ ...msg })
                    }
                },
                onComplete: (msg) => {
                    seel.loading = false
                },
                onError: (error) => {
                    seel.loading = false
                    seel.messages.push(创建消息('error', error.message))
                }
            })

            if (success) {
                return {
                    content,
                    seel: seel.config.name,
                    displayName: seel.config.displayName
                }
            }
            return null
        } catch (e) {
            seel.loading = false
            console.error('流处理异常:', e)
            return null
        }
    })
    
    return (await Promise.all(responsePromises)).filter(Boolean);
};

export const 生成共识聊天回复 =(validResponses, trinityResult, voteResults, sagesCount) => {
    const weightedResults = validResponses
        .map((content, index) => ({
            content,
            weight: voteResults
                .filter(v => v?.scores)
                .reduce((acc, cur) => acc + (cur.scores[index]?.score || 0), 0) / sagesCount
        }))
        .sort((a, b) => b.weight - a.weight)

    return {
        type: 'consensus',
        content: trinityResult || (weightedResults[0]?.content || '未达成共识'),
        status: 'success',
        meta: {
            source: trinityResult ? 'trinity' : 'weighted',
            weights: weightedResults.map(w => w.weight),
            details: weightedResults
        },
        timestamp: Date.now()
    }
}


export const handleTrinitySummary = async (validResponses, trinity, userMessage) => {
    if (!validResponses.length || !trinity) return null;
    
    console.log('开始Trinity总结', {
        responses: validResponses.map(r => ({
            seel: r.seel,
            contentLength: r.content.length,
            content:r.content
        }))
    });

    try {
        const trinityContext = { context: { responses: validResponses } }
        const trinityResponse = await trinity.reply(userMessage, trinityContext)
        const { content: trinityContent, success } = await 处理流式消息(trinityResponse, {
            onStart: (msg) => trinity.loading = true,
            onChunk: (msg) => {
                const existingMsg = trinity.messages.find(m => m.id === msg.id)
                existingMsg ? Object.assign(existingMsg, msg) : trinity.messages.push({ ...msg })
            },
            onComplete: (msg) => trinity.loading = false,
            onError: (error) => {
                trinity.loading = false
                trinity.messages.push(创建消息('error', '响应生成失败: ' + error.message))
            }
        })
        return success ? trinityContent : null
    } catch (error) {
        trinity.loading = false
        console.error('Trinity响应错误:', error)
        trinity.messages.push(创建消息('error', '响应生成失败: ' + error.message))
        return null
    }
}
export const processVoting = async (sages, validResponses, updateProgress) => {
    const voteResults = []
    for (let i = 0; i < sages.length; i++) {
        const seel = sages[i]
        const progress = Math.floor((i / sages.length) * 100)
        updateProgress(progress)
        try {
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
    return voteResults
}

