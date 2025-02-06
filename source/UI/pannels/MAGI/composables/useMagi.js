import { ref, reactive } from '../../../../../static/vue.esm-browser.js'
import { initMagi, MockTrinity } from '../core/mockMagi.js'

export function useMagi() {
    const seels = reactive([])
    const connectionStatus = ref('disconnected')
    const consensusMessages = reactive([])

    
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

    return {
        seels,
        connectionStatus,
        consensusMessages,
        initializeMAGI
    }
} 