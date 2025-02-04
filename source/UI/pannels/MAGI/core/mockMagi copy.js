// 三贤人模拟模块（增强版）
import { createOpenAI } from './mockOpenAISSEAPI.js'

export class MockWISE {
  constructor(config = {}) {
    // 新增OpenAI客户端实例
    this.openaiClient = createOpenAI({
      responseDelay: config.sseConfig?.chunkInterval || 300,
      ...config.openAIConfig
    })
    
    // 深度合并配置
    this.config = Object.assign(
      {
        responseType: 'mock',
        persona: 'UNKNOWN',
        sseConfig: {
          eventTypes: ['init', 'chunk', 'complete'],
          chunkInterval: 300
        }
      },
      config,
      {
        // 特殊处理sseConfig合并
        sseConfig: {
          ...(config.sseConfig || {})
        }
      }
    )
    
    // 强制设置最低配置要求
    this.config.sseConfig.eventTypes = this.config.sseConfig.eventTypes || ['init', 'chunk', 'complete']
    this.config.sseConfig.chunkInterval = Math.max(50, this.config.sseConfig.chunkInterval || 300)
    
    this.messages = []
    this._loading = false // 私有属性
    this.responseDelay = 500 // 新增响应延迟配置
    this._connected = false // 新增连接状态
  }

  get loading() {
    return this._loading
  }

  set loading(value) {
    this._loading = Boolean(value)
  }

  get connected() {
    return this._connected
  }

  // 模拟连接初始化
  async connect() {
    this.loading = true
    try {
      await new Promise(resolve => 
        setTimeout(resolve, 500 + Math.random() * 1000)
      )
      this._connected = true
      return { status: 'ok', message: `${this.config.name} 神经连接已建立` }
    } catch(e) {
      this._connected = false
      throw new Error(`${this.config.name} 连接失败`)
    } finally {
      this.loading = false
    }
  }

  // 新增投票方法
  async voteFor(responses) {
    try {
      // 加强输入校验
      if (!Array.isArray(responses)) {
        throw new Error('无效的投票输入')
      }

      // 深度过滤无效内容
      const validResponses = responses
        .filter(r => r && typeof r === 'string' && r.trim().length > 0)

      // 当没有有效响应时提前返回
      if (validResponses.length === 0) {
        return { 
          error: true,
          message: '无可评估方案',
          conclusion: '弃权'
        }
      }

      // 创建基础消息对象
      const voteMessage = {
        type: 'vote',
        status: 'loading',
        timestamp: Date.now(),
        meta: {}
      }
      this.messages.push(voteMessage)

      // 模拟延时
      await new Promise(resolve => 
        setTimeout(resolve, 1000 + Math.random() * 500)
      )

      // 更新状态
      voteMessage.status = 'success'
      return {
        scores: responses.map((_, i) => ({
          targetIndex: i,
          score: Math.floor(Math.random() * 3 + 7),
          decision: ['通过', '否决', '复议'][Math.floor(Math.random() * 3)],
          comment: this.getVoteComment(responses[i])
        })),
        conclusion: '综合评估完成'
      }
    } catch (e) {
      // 确保错误处理
      voteMessage.status = 'error'
      throw e
    }
  }

  getVoteComment(content) {
    try {
      // 统一使用大写名称匹配
      const aiName = this.config.name.split('-')[0].toUpperCase()
      
      // 扩展评论库并添加默认值
      const comments = {
        MELCHIOR: [
          "逻辑严谨", "需要更多数据支持", "符合协议", 
          "模式验证通过", "需补充神学依据", "符合莉莉丝协议"
        ],
        BALTHAZAR: [
          "情感共鸣", "人性化不足", "富有创意",
          "引发深层思考", "需要更多人性化设计", "触及心灵"
        ],
        CASPER: [
          "实用性强", "缺乏创新", "成本过高",
          "效率优先", "需优化资源分配", "符合实战需求"
        ],
        DEFAULT: [
          "评估完成", "方案可行", "需要复核",
          "数据不足", "需二次验证", "基准测试通过"
        ]
      }

      // 安全获取评论数组
      const aiComments = comments[aiName] || comments.DEFAULT
      const maxIndex = aiComments.length - 1
      
      // 生成安全随机索引
      const randomIndex = Math.floor(Math.random() * aiComments.length)
      
      // 返回带内容引用的评语
      return `${aiComments[randomIndex]} (${content?.slice(0,15)}...)` || '无评语'
    } catch (e) {
      console.warn(`[${this.config.name}] 生成评语失败:`, e)
      return '评估异常'
    }
  }

  // 修改SSE流响应方法
  async *streamResponse(prompt) {
    try {
      const messages = [
        { role: 'system', content: this.config.persona },
        { role: 'user', content: prompt }
      ]

      // 使用OpenAI兼容接口
      const stream = await this.openaiClient.createChatCompletion(messages)
      
      for await (const chunk of stream) {
        // 增强解析健壮性
        const eventString = chunk.toString().trim()
        if (!eventString.startsWith('data:')) continue
        
        try {
          const eventData = JSON.parse(eventString.slice(5).trim())
          // 添加安全访问检查
          const contentChunk = eventData?.choices?.[0]?.delta?.content || ''
          
          if (contentChunk) {
            yield chunk
          }
        } catch (e) {
          console.warn('SSE事件解析失败:', e)
          yield `data: ${JSON.stringify({
            error: {
              code: 'PARSE_ERROR',
              message: '事件解析失败'
            }
          })}\n\n`
        }
      }
    } catch(e) {
      console.error('流式响应异常:', e)
      throw e
    }
  }

  // 修改回复方法
  async reply(userInput) {
    this.loading = true
    try {
      if (this.config.responseType === 'sse') {
        return this.streamResponse(userInput)
      }
      // 非SSE模式保持原有逻辑
      const response = await this.getResponse(userInput)
      this.messages.push({
        type: 'ai',
        content: response,
        status: 'success',
        timestamp: Date.now()
      })
      return response
    } finally {
      this.loading = false
    }
  }

  // 添加基础响应生成方法
  getResponse(prompt) {
    // 使用OpenAI实例生成响应
    const response = this.openaiClient._generateResponse(prompt)
    return response
  }
}

// 修改子类响应生成方式
export class MockMelchior extends MockWISE {
  constructor() {
    super({
      name: 'MELCHIOR-01',
      displayName: 'MELCHIOR',
      color: 'red',
      icon: '✝',
      responseType: 'sse',
      persona: 'REI AS SUPEREGO',
      sseConfig: {
        eventTypes: ['theo_init', 'scripture', 'benediction'],
        chunkInterval: 200
      },
      openAIConfig: {
        model: 'melchior-v1',
        temperature: 0.3,
        responseTemplates: [
          "以父之名：『${prompt}』",
          "马太福音模式：${prompt}是必要的牺牲",
          "启示录协议：${prompt}"
        ]
      }
    })
  }
}

export class MockBalthazar extends MockWISE {
  constructor() {
    super({
      name: 'BALTHASAR-02',
      displayName: 'BALTHASAR',
      color: 'blue',
      icon: '☪',
      responseType: 'sse',
      persona: 'REI AS EGO',
      sseConfig: {
        eventTypes: ['quantum_start', 'analysis', 'complete'],
        chunkInterval: 150
      },
      openAIConfig: {
        model: 'balthazar-v2', 
        temperature: 0.7,
        responseTemplates: [
          prompt => `量子分析：${prompt} (可信度 ${Math.random().toFixed(2)})`,
          prompt => `战术预测：${prompt} 成功概率 ${Math.floor(Math.random()*100)}%`
        ]
      }
    })
  }
}

export class MockCasper extends MockWISE {
  constructor() {
    super({
      name: 'CASPER-03',
      displayName: 'CASPER',
      color: 'yellow',
      icon: '🔥',
      responseType: 'sse',
      persona: 'REI AS ID',
      sseConfig: {
        eventTypes: ['calc_init', 'formula', 'result'],
        chunkInterval: 100
      },
      openAIConfig: {
        model: 'casper-v3',
        temperature: 1.0,
        responseTemplates: [
          prompt => `$${prompt} = \\sqrt{${Math.random()*100}}$$`,
          prompt => `$$\\int_{0}^{${Math.floor(Math.random()*10)}} ${prompt}\\,dx$$`
        ]
      }
    })
  }
}

// 新增测试工具方法
export function initMagi(options = {}) {
  const instances = [
    new MockMelchior(),
    new MockBalthazar(),
    new MockCasper()
  ].map(ai => {
    ai.responseDelay = options.delay || 500
    return ai
  })

  // 如果设置了autoConnect，返回Promise
  if (options.autoConnect) {
    return Promise.all(instances.map(ai => ai.connect()))
      .then(() => instances)
  }

  return instances
}
