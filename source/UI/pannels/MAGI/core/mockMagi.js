// 三贤人模拟模块（增强版）
export class MockWISE {
  constructor(config) {
    this.config = {
      responseType: 'mock', // 新增响应类型字段
      persona: 'UNKNOWN',  // 添加默认值
      sseConfig: { // 新增SSE配置
        eventTypes: ['init', 'chunk', 'complete'],
        chunkInterval: 300,
        ...config?.sseConfig
      },
      ...config  // 确保config在后面以覆盖默认值
    }
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

  // 新增SSE流响应方法
  async *streamResponse(prompt) {
    const newMsg = {
      type: 'sse_stream',
      content: '',
      status: 'loading',
      timestamp: Date.now()
    }
    this.messages.push(newMsg)

    try {
      // 模拟流式响应开始
      yield `event: ${this.sseConfig.eventTypes[0]}\ndata: ${JSON.stringify({status: 'START'})}\n\n`
      
      // 生成分块响应
      const chunks = this.getRandomResponse().split('...')
      for (const [index, chunk] of chunks.entries()) {
        await new Promise(resolve => 
          setTimeout(resolve, this.sseConfig.chunkInterval + Math.random() * 200)
        )
        newMsg.content += chunk + '...'
        yield `event: ${this.sseConfig.eventTypes[1]}\ndata: ${JSON.stringify({
          content: chunk,
          progress: (index + 1)/chunks.length
        })}\n\n`
      }

      // 流式响应完成
      yield `event: ${this.sseConfig.eventTypes[2]}\ndata: ${JSON.stringify({status: 'DONE'})}\n\n`
      newMsg.status = 'success'
    } catch(e) {
      newMsg.status = 'error'
      throw e
    }
  }

  // 修改回复方法以支持SSE
  async reply(userInput) {
    this.loading = true
    try {
      if (this.config.responseType === 'sse') {
        return this.streamResponse(userInput) // 返回生成器
      }
      const newMsg = {
        type: 'ai', // 使用合法类型
        content: this.getRandomResponse(),
        status: 'loading',
        timestamp: Date.now()
      }
      this.messages.push(newMsg)
      
      // 添加随机延时（800-1500ms）
      await new Promise(resolve => 
        setTimeout(resolve, 800 + Math.random() * 700)
      )
      
      newMsg.status = 'success'
      return newMsg
    } catch(e) {
      newMsg.status = 'error'
      throw e
    } finally {
      this.loading = false
    }
  }

  // 扩展随机响应库
  getRandomResponse() {
    const responses = [
      "模拟同步率400%...模式BLUE",
      "虚拟AT力场中和完成",
      "模拟LCL浓度稳定",
      "测试插入栓深度正常",
      "虚拟使徒核心定位完成",
      "模拟思考模式：战术预测", // 新增响应
      "虚拟作战方案生成中...",   // 新增响应
      "模拟神经连接强度：89%"   // 新增响应
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }
}

// 增强各模拟类配置
export class MockMelchior extends MockWISE {
  constructor() {
    super({
      name: 'MELCHIOR-01',
      displayName: 'MELCHIOR',
      color: 'red',
      icon: '✝',
      responseType: 'theological',
      persona: 'REI AS SUPEREGO', // 确保这个值被正确传递
      sseConfig: {
        eventTypes: ['theo_init', 'scripture', 'benediction'] // 定制化事件类型
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
      responseType: 'emotional',
      persona: 'REI AS EGO', // 自我
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
      responseType: 'practical',
      persona: 'REI AS ID', // 本我
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
