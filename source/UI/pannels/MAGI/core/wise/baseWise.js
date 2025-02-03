import { EventEmitter } from 'events'
import Marduk from '../marduk.js'

export class WISE extends EventEmitter {
  constructor(api, config, persona) {
    super()
    this.api = api
    this.config = config
    this.persona = persona
    this.votePrompt = ''
    this.replyPrompt = ''
    this.summarizePrompt = ''
  }

  async voteFor(functions, descriptions, inputs, goal) {
    try {
      await this.prepareSystemPrompt(this.votePrompt)
      const formattedInput = this.formatFunctionInfo(functions, descriptions, inputs, goal)
      const response = await this.api.post({
        model: this.config.model,
        messages: [{
          role: 'system',
          content: this.votePrompt
        }, {
          role: 'user',
          content: JSON.stringify(formattedInput)
        }]
      })
      return this.parseVoteResponse(response)
    } catch (error) {
      console.error(`${this.persona.name}投票失败:`, error)
      this.emit('error', error)
      return []
    }
  }

  async reply(userInput) {
    try {
      await this.prepareSystemPrompt(this.replyPrompt)
      const response = await this.api.post({
        model: this.config.model,
        messages: [{
          role: 'system',
          content: this.replyPrompt
        }, {
          role: 'user',
          content: JSON.stringify(userInput)
        }]
      })
      this.emit('response', response)
      return response
    } catch (error) {
      console.error(`${this.persona.name}回复失败:`, error)
      this.emit('error', error)
      return null
    }
  }

  async summarize(conversation) {
    try {
      await this.prepareSystemPrompt(this.summarizePrompt)
      const response = await this.api.post({
        model: this.config.model,
        messages: [{
          role: 'system',
          content: this.summarizePrompt
        }, {
          role: 'user',
          content: JSON.stringify(conversation)
        }]
      })
      return this.parseSummary(response)
    } catch (error) {
      console.error(`${this.persona.name}总结失败:`, error)
      return []
    }
  }

  // 辅助方法
  formatFunctionInfo(functions, descriptions, inputs, goal) {
    return functions.map((func, index) => ({
      name: func.name,
      content: func.action.toString(),
      description: descriptions[index],
      input: JSON.stringify(inputs[index]),
      goal: goal
    }))
  }

  async prepareSystemPrompt(prompt) {
    // 动态加载马杜克协议中的提示词
    const protocol = await Marduk.getCurrentProtocol()
    return protocol.applyPromptTemplate(prompt)
  }

  parseVoteResponse(response) {
    try {
      const content = response.choices[0].message.content
      if (content.startsWith('```json')) {
        return JSON.parse(content.replace(/```json/g, '').replace(/```/g, ''))
      }
      return JSON.parse(content)
    } catch (error) {
      console.error(`${this.persona.name}投票解析失败:`, error)
      this.emit('parse-error', error)
      return []
    }
  }

  parseSummary(response) {
    try {
      const content = response.choices[0].message.content
      return content.startsWith('```json') 
        ? JSON.parse(content.replace(/```json/g, '').replace(/```/g, ''))
        : JSON.parse(content)
    } catch (error) {
      console.error(`${this.persona.name}总结解析失败:`, error)
      return []
    }
  }

  // 同步率检测
  checkSync() {
    const baseWeight = Marduk.getSEELConfig(this.persona.name.toLowerCase()).baseWeight
    const currentSync = this.calculateSyncRatio()
    return {
      status: currentSync >= baseWeight * 0.8 ? 'synced' : 'desynced',
      ratio: currentSync,
      threshold: baseWeight * 0.8
    }
  }

  calculateSyncRatio() {
    const successRate = this.api.successRate || 1.0
    const latencyFactor = 1 - Math.min(this.api.averageLatency / 1000, 1.0)
    return (successRate * 0.7 + latencyFactor * 0.3) * 100 // 百分比形式
  }
} 