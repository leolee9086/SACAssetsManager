import { initializeAIConfig } from './configLoader.js'
import { EventEmitter } from 'events'
import Marduk from './marduk.js'
import { Melchior, Balthazar, Casper } from './wise/index.js'

export class MAGISystem extends EventEmitter {
  constructor() {
    super()
    this.aiConfig = null
    this.seels = []
    this.currentLeader = 'BALTHASAR-02'
    this.voteHistory = []
    this.syncRatios = new Map()
  }

  async init() {
    try {
      // 初始化马杜克协议
      await Marduk.configManager.loadLatest()
      
      // 构建三贤人系统
      this.seels = [
        this.createSEEL('melchior'),
        this.createSEEL('balthasar'),
        this.createSEEL('caspar')
      ]
      
      // 启动心跳监测
      this.startSyncMonitor()
      
      this.emit('system-ready')
      return true
    } catch (error) {
      console.error('MAGI系统启动失败:', error)
      this.emit('system-error', error)
      return false
    }
  }

  createSEEL(type) {
    const baseConfig = Marduk.getSEELConfig(type)
    return {
      ...baseConfig,
      processor: this.getProcessor(type),
      messages: [],
      status: 'standby',
      lastActive: Date.now()
    }
  }

  getProcessor(type) {
    const processors = {
      melchior: new Melchior(this.generateAPI(), Marduk.configManager.currentConfig),
      balthazar: new Balthazar(this.generateAPI(), Marduk.configManager.currentConfig),
      caspar: new Casper(this.generateAPI(), Marduk.configManager.currentConfig)
    }
    return processors[type]
  }

  generateAPI() {
    return {
      post: async (prompt) => {
        const response = await Marduk.generateResponse(
          this.currentLeader.split('-')[0].toLowerCase(),
          'standard'
        )
        return { choices: [{ message: { content: response } }] }
      }
    }
  }

  // 三位一体决策协议
  async trinityVote(input, context) {
    const responses = await Promise.all(
      this.seels.map(seel => 
        seel.processor.reply(input, context)
          .catch(error => this.handleVoteError(seel, error))
      )
    )

    const validResponses = responses.filter(r => r?.choices?.[0]?.message?.content)
    if (validResponses.length === 0) throw new Error('所有SEEL决策失效')

    const consensus = Marduk.generateConsensus(
      validResponses.map(r => r.choices[0].message.content)
    )
    
    this.recordVoteResult(validResponses, consensus)
    return consensus
  }

  handleVoteError(seel, error) {
    console.error(`${seel.name}决策失效:`, error)
    this.emit('seel-error', { seel, error })
    return null
  }

  recordVoteResult(responses, consensus) {
    this.voteHistory.push({
      timestamp: Date.now(),
      responses: responses.map(r => ({
        seel: r.seel.name,
        content: r.choices[0].message.content
      })),
      consensus,
      weights: this.calculateWeights(responses)
    })
  }

  calculateWeights(responses) {
    return responses.reduce((acc, res) => {
      const seelType = res.seel.name.split('-')[0].toLowerCase()
      acc[seelType] = (acc[seelType] || 0) + 1
      return acc
    }, {})
  }

  // 同步率监测
  startSyncMonitor() {
    this.syncInterval = setInterval(() => {
      this.seels.forEach(seel => {
        const ratio = Marduk.validateSynchronization(seel) ? 1 : 0.8
        this.syncRatios.set(seel.name, ratio)
      })
    }, 5000)
  }

  getSystemStatus() {
    return {
      online: this.seels.length > 0,
      leader: this.currentLeader,
      syncRatios: Object.fromEntries(this.syncRatios),
      lastVote: this.voteHistory.slice(-1)[0]
    }
  }

  // 获取当前配置
  getCurrentConfig() {
    return {...this.aiConfig}
  }

  // 重新加载配置
  async reloadConfig() {
    const newConfig = await initializeAIConfig()
    this.aiConfig = newConfig
    return newConfig
  }
} 