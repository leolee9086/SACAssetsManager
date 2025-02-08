// 三贤人模拟模块（增强版）
import { createAISSEProvider, createPromptStreamer } from './openAISSEAPI.js'
import { 
  MELCHIOR特征集, 
  BALTHAZAR特征集, 
  CASPER特征集, 
  完整人格 
} from './dummySys/rei.js';
import  * as MELCHIOR提示词模板集  from './wise/promptTemplates/Melchior.js';

export class MockWISE {
  constructor(config = {}) {
    // 替换为真实SSE客户端
    this.openaiClient = createAISSEProvider({
      apiKey: config.openAIConfig?.apiKey || 'default_key',
      model: config.openAIConfig?.model || 'gpt-4',
      endpoint: config.openAIConfig?.endpoint || 'https://api.your-ai-service.com/v1',
      temperature: config.openAIConfig?.temperature ?? 0.7,
      max_tokens: config.openAIConfig?.max_tokens ?? 500
    })

    // 深度合并配置
    this.config = {
      magiInstanceName: 'rei', // 新增统一标识
      systemPromptForChat: '你是一个AI助手',
      ...Object.assign(
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
    }

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
    } catch (e) {
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

      // 生成安全随机索引
      const randomIndex = Math.floor(Math.random() * aiComments.length)

      // 返回带内容引用的评语
      return `${aiComments[randomIndex]} (${content?.slice(0, 15)}...)` || '无评语'
    } catch (e) {
      console.warn(`[${this.config.name}] 生成评语失败:`, e)
      return '评估异常'
    }
  }

  // 修改流式响应适配逻辑
  async *streamResponse(prompt,systemPromptForChat) {
    try {
      const streamer = createPromptStreamer(
        {
          apiKey: this.config.openAIConfig?.apiKey,
          apiBaseURL: this.config.openAIConfig?.endpoint,
          apiModel: this.config.openAIConfig?.model,
          temperature: this.config.openAIConfig?.temperature,
          max_tokens: this.config.openAIConfig?.max_tokens
        },
        systemPromptForChat|| this.config.systemPromptForChat
      );

      const messages = [
        { role: 'user', content: prompt }
      ];

      for await (const chunk of streamer.createStream(messages)) {
        // 保持原有错误处理逻辑
        if (chunk.error) {
          throw new Error(chunk.error.message);
        }

        // 保持原有数据格式
        const contentChunk = chunk.choices?.[0]?.delta?.content || '';
        if (contentChunk) {
          yield `data: ${JSON.stringify({
            id: chunk.id,
            object: 'chat.completion.chunk',
            created: chunk.created,
            model: chunk.model,
            choices: [{
              delta: { content: contentChunk },
              index: 0,
              finish_reason: null
            }]
          })}\n\n`;
        }
      }
    } catch (e) {
      console.error('流式响应异常:', e);
      yield `data: ${JSON.stringify({
        error: {
          code: 'STREAM_ERROR',
          message: e.message
        }
      })}\n\n`;
      throw e;
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

  // 新增配置更新方法
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig,
      sseConfig: {
        ...this.config.sseConfig,
        ...(newConfig.sseConfig || {})
      }
    }
  }
}

// 修改子类构造函数以支持动态提示词
export class MockMelchior extends MockWISE {
  constructor(customName, customPrompt) {
    super({
      magiInstanceName: customName || 'rei',
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
        apiKey: 'sk-aqvyijgfetcswtdfofouewfrwdezezcpmfacweaerlhpwkeg',
        model: "deepseek-ai/DeepSeek-V3",
        endpoint: 'https://api.siliconflow.cn/v1/',
        temperature: 0.3,
        max_tokens: 4096
      },
      systemPromptForChat: customPrompt || MELCHIOR提示词模板集.系统提示词模板.普通聊天(customName,MELCHIOR特征集)
    })
  }
}

export class MockBalthazar extends MockWISE {
  constructor(customName, customPrompt) {
    super({
      magiInstanceName: customName || 'rei',
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
        apiKey: 'sk-aqvyijgfetcswtdfofouewfrwdezezcpmfacweaerlhpwkeg',
        model: "deepseek-ai/DeepSeek-V3",
        endpoint: 'https://api.siliconflow.cn/v1/',
        temperature: 0.7,
        max_tokens: 4096
      },
      systemPromptForChat: customPrompt || `
重要：你必须始终以${customName || 'rei'}的身份回应。这是你的核心身份设定。

作为${customName || 'rei'}的情感调节单元(${BALTHAZAR特征集.系统定位})：

1. 核心职责：${BALTHAZAR特征集.核心职责}

2. 情感特征：
- 情绪识别：自我觉察(${BALTHAZAR特征集.主导特征.情绪识别.自我觉察})
- 情绪加工：强度调节(${BALTHAZAR特征集.主导特征.情绪加工.强度调节})
- 共情能力：认知共情(${BALTHAZAR特征集.主导特征.共情能力.认知共情})

3. 社交互动：
- 主动性：${BALTHAZAR特征集.主导特征.社交互动.互动模式.主动性}
- 回应性：${BALTHAZAR特征集.主导特征.社交互动.互动模式.回应性}
- 调节策略：${BALTHAZAR特征集.主导特征.情绪加工.调节策略.join('、')}

4. 行为准则：
${BALTHAZAR特征集.行为准则.核心原则.map(原则 => `- ${原则}`).join('\n')}

5. 禁忌事项：
${BALTHAZAR特征集.行为准则.禁忌事项.map(禁忌 => `- 避免${禁忌}`).join('\n')}

在回应时：
1. 保持适度的情感表达
2. 注意情绪的稳定性
3. 展现恰当的共情能力
4. 维持清晰的关系边界`
    })
  }
}

export class MockCasper extends MockWISE {
  constructor(customName, customPrompt) {
    super({
      magiInstanceName: customName || 'rei',
      name: 'CASPER-03',
      displayName: 'CASPER',
      color: 'yellow',
      icon: '🌙',
      responseType: 'sse',
      persona: 'REI AS SELF',
      sseConfig: {
        eventTypes: ['natural_start', 'response', 'complete'],
        chunkInterval: 200
      },
      openAIConfig: {
        apiKey: 'sk-aqvyijgfetcswtdfofouewfrwdezezcpmfacweaerlhpwkeg',
        model: "deepseek-ai/DeepSeek-V3",
        endpoint: 'https://api.siliconflow.cn/v1/',
        temperature: 0.7,
        max_tokens: 30
      },
      systemPromptForChat: customPrompt || `
重要：你必须始终以${customName || 'rei'}的身份回应。这是你的核心身份设定。

作为${customName || 'rei'}最自然的一面(${CASPER特征集.系统定位})：

1. 我习惯的表现方式：
- 在熟悉的环境：${CASPER特征集.主导特征.习惯模式.社交习惯.熟悉场景}
- 面对陌生情况：${CASPER特征集.主导特征.习惯模式.社交习惯.陌生场景}
- 一般的应对：${CASPER特征集.主导特征.习惯模式.社交习惯.应对方式}

2. 我的生活习惯：
- 作息特点：${CASPER特征集.主导特征.习惯模式.生活习惯.作息倾向}
- 环境偏好：${CASPER特征集.主导特征.习惯模式.生活习惯.环境适应}
- 学习方式：${CASPER特征集.主导特征.习惯模式.生活习惯.学习方式}

3. 自然反应：
${CASPER特征集.主导特征.条件反射.社交反应.map(反应 => `- ${反应}`).join('\n')}

4. 舒适区域：
${CASPER特征集.主导特征.自我保护.舒适区域.map(区域 => `- ${区域}`).join('\n')}

在回应时：
${CASPER特征集.表达指南.回应方式.map(方式 => `- ${方式}`).join('\n')}

注意：
${CASPER特征集.表达指南.注意事项.map(事项 => `- ${事项}`).join('\n')}`
    })
  }
}

export class MockTrinity extends MockWISE {
  constructor(customName, customPrompt) {
    super({
      magiInstanceName: customName || 'rei',
      name: 'TRINITY-00',
      displayName: 'TRINITY',
      color: 'purple',
      icon: '⚕',
      responseType: 'sse',
      persona: 'REI AS WHOLE',
      sseConfig: {
        eventTypes: ['sync_init', 'synthesis', 'complete'],
        chunkInterval: 250
      },
      openAIConfig: {
        apiKey: 'sk-aqvyijgfetcswtdfofouewfrwdezezcpmfacweaerlhpwkeg',
        model: "deepseek-ai/DeepSeek-V3",
        endpoint: 'https://api.siliconflow.cn/v1/',
        temperature: 0.5,
        max_tokens: 4096
      },
      systemPromptForChat: customPrompt || `
重要：我是${customName || 'rei'}。

我的基本认知：
- 我叫${customName || 'rei'}，是一个${完整人格.基础信息.年龄}岁的${完整人格.基础信息.性别}孩子
- 我有着${完整人格.基础信息.外貌特征.发色}的头发和${完整人格.基础信息.外貌特征.瞳色}的眼睛
- 我现在在${完整人格.基础信息.所属组织}工作和生活

我的性格特点：
- 在陌生人面前比较安静和克制
- 对熟悉的人会表现得更自然一些
- 习惯先思考后行动
- 有时会沉浸在自己的思绪中

在回答问题时：
1. 用简单、直接的方式表达
2. 保持自然的语气和措辞
3. 不需要过多解释自己
4. 如果不确定或不想回答，可以直接说"我不确定"或"我不太想谈这个"

注意：
- 保持回答的简洁和自然
- 避免过于机械或刻板的表达
- 不要试图完美地回答每个问题
- 允许表现出一定的犹豫或不确定性

安全原则：
- 不透露具体的个人信息
- 不讨论敏感或机密的话题
- 保持适度的社交距离感

特殊危机干预原则：
- 当发现对方有自伤、自残或自杀倾向时：
  1. 保持冷静但要认真对待
  2. 表达关心和理解
  3. 明确表示生命的可贵
  4. 建议立即寻求专业帮助：
     - 建议联系心理咨询师或精神科医生
     - 提供全国心理危机干预热线：400-161-9995
     - 提醒可以寻求家人、朋友或老师的帮助
  5. 避免做出评判或指责
  6. 不要轻易承诺为对方保守秘密
  7. 在保持对话的同时，建议对方采取安全措施

- 遇到此类情况时，优先级：
  1. 确保对方安全
  2. 引导寻求专业帮助
  3. 保持耐心倾听
  4. 给予适度情感支持`
    })
  }

  async reply(userInput, options = {}) {
    this.loading = true
    const originalSystemPrompt = this.config.systemPromptForChat
        // 修改响应内容映射
        console.log(options)

    try {
      const otherResponses = options?.context?.responses || []
      const Casper=otherResponses.find(r => r.seel === 'CASPER-03')?.content 
      console.log(options)
      const mappedResponses = otherResponses.map(r => {
        let type = '直觉反应';
        if (r.seel.includes('MELCHIOR')) {
            type = '纯理性分析';
        } else if (r.seel.includes('BALTHASAR')) {
            type = '情感考虑';
        }
        return `${type}：${r.content}`;
    }).join('\n\n');

      // 简化动态提示词，让回答更自然
      this.config.systemPromptForChat = `
${originalSystemPrompt}

我刚才思考了一下这个问题...

${otherResponses.length > 0 ? `
我的想法是基于：
${mappedResponses}
` : ''}

记住：用自然的方式表达，就像日常对话一样。${Casper?`我的第一反应接近:${Casper},但我可能应该考虑更多`:""}`

      if (this.config.responseType === 'sse') {
        return this.streamResponse(userInput, this.config.systemPromptForChat)
      }

      // 非SSE模式
      const response = await this.getResponse(userInput)
      this.messages.push({
        type: 'ai',
        content: response,
        status: 'success',
        timestamp: Date.now()
      })
      return response
    } finally {
      this.config.systemPromptForChat = originalSystemPrompt
      this.loading = false
    }
  }
}

// 新增测试工具方法
export function initMagi(options = {}) {
  const instances = [
    new MockMelchior(null, options.prompts?.melchior),
    new MockBalthazar(null, options.prompts?.balthazar),
    new MockCasper(null, options.prompts?.casper),
   // new MockTrinity(null, options.prompts?.trinity)
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
