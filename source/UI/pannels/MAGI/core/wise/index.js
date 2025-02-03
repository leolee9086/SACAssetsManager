// 三贤人核心逻辑模块
import { WISE } from './baseWise.js'

// 梅尔基奥尔 - 逻辑分析型
export class Melchior extends WISE {
  constructor(api, config) {
    super(api, config, {
      name: 'MELCHIOR',
      color: '#ff3366',
      icon: '✝',
      responseType: 'theological'
    })
    
    this.votePrompt = `请从用户提供的功能中选择最符合逻辑且能有效达成目标的选项，需满足：
1. 技术可行性 ≥ 9/10
2. 执行效率 ≥ 8/10
3. 逻辑严谨性 ≥ 9/10

输入格式：
[
  {
    "name": "功能名称",
    "content": "功能实现",
    "description": "功能描述",
    "input": "输入参数",
    "goal": "用户目标"
  }
]

必须返回严格遵循以下要求的JSON数组：
[
  {
    "name": "功能名称",
    "score": 0-10（必须体现技术差异）
  }
]
禁止包含其他内容`

    this.replyPrompt = `作为逻辑分析专家，你的回答必须：
1. 严格遵循科学原理
2. 使用结构化表达
3. 包含可行性分析
4. 避免情感化表达`

    this.summarizePrompt = `请用技术术语总结对话要点，要求：
1. 保持专业术语
2. 区分技术参数
3. 标记关键步骤

输入格式：
[
  {
    "role": "角色",
    "content": "内容"
  }
]

返回格式（严格遵循）：
{
  "summary": "技术总结",
  "parameters": ["参数列表"],
  "steps": ["关键步骤"]
}`

    // 初始化同步率
    this.checkSync()
  }

  // 覆盖投票方法增加逻辑验证
  async voteFor(functions, descriptions, inputs, goal) {
    try {
      const result = await super.voteFor(functions, descriptions, inputs, goal)
      return this.validateLogicalScores(result)
    } catch (error) {
      this.emit('error', error)
      return []
    }
  }

  validateLogicalScores(scores) {
    return scores.filter(item => 
      item.score >= 7 && item.score <= 10
    )
  }

  // 技术可行性评估
  async technicalAssessment(func) {
    const response = await this.api.post({
      model: this.config.model,
      messages: [{
        role: 'system',
        content: `评估技术可行性：
1. 分析实现难度（1-5级）
2. 识别技术依赖
3. 预估资源消耗
返回JSON格式：{difficulty: number, dependencies: array, resourceCost: number}`
      }, {
        role: 'user',
        content: JSON.stringify(func)
      }]
    })
    return this.parseTechnicalResponse(response)
  }

  // 多方案比较
  async compareSolutions(solutions) {
    const comparison = await Promise.all(
      solutions.map(s => this.technicalAssessment(s))
    )
    this.emit('solutionsCompared', comparison)
    return comparison.sort((a, b) => a.difficulty - b.difficulty)
  }
}

// 巴尔萨泽 - 情感共鸣型
export class Balthazar extends WISE {
  constructor(api, config) {
    super(api, config, {
      name: 'BALTHAZAR',
      color: '#33ccff',
      icon: '☪',
      responseType: 'emotional'
    })
    
    this.votePrompt = `请选择最能引发情感共鸣且符合用户心理预期的功能，需满足：
1. 情感丰富度 ≥ 8/10
2. 同理心表现 ≥ 9/10
3. 趣味性 ≥ 7/10

输入格式：
[
  {
    "name": "功能名称",
    "content": "功能实现",
    "description": "功能描述",
    "input": "输入参数",
    "goal": "用户目标"
  }
]

必须返回严格遵循以下要求的JSON数组：
[
  {
    "name": "功能名称",
    "score": 0-10（必须体现明显区分度）
  }
]
禁止包含其他内容`

    this.summarizePrompt = `请用生动自然的语言总结对话要点，要求：
1. 保持用户原始语言
2. 包含情感脉络分析
3. 区分用户与助手观点

输入格式：
[
  {
    "role": "角色",
    "content": "内容"
  }
]

返回格式（严格遵循）：
{
  "summary": "总结内容",
  "emotionalFlow": ["情感关键词"],
  "perspectives": {
    "user": ["用户观点"], 
    "assistant": ["助手观点"]
  }
}`

    this.replyPrompt = `作为情感支持专家，你必须：
1. 展现深度同理心（使用至少3种情感支持技巧）
2. 保持温暖自然的语气
3. 避免技术术语
4. 提供可操作建议
5. 必要时请求更多情感背景

当前人格设定：${this.persona.bootPrompts.content}`
  }

  // 覆盖回复方法增加情感分析
  async reply(userInput) {
    try {
      const response = await super.reply(userInput)
      this.emit('emotionalAnalysis', this.analyzeEmotion(response))
      return response
    } catch (error) {
      this.emit('error', error)
      return null
    }
  }

  // 情感光谱分析
  async analyzeEmotion(response) {
    const analysis = await this.api.post({
      model: this.config.model,
      messages: [{
        role: 'system',
        content: `分析文本情感：
1. 识别主要情绪（愤怒/快乐/悲伤/惊讶）
2. 评估情绪强度（0-10）
3. 检测潜在心理需求
返回JSON格式：{emotion: string, intensity: number, needs: array}`
      }, {
        role: 'user',
        content: response.choices[0].message.content
      }]
    })
    const result = JSON.parse(analysis.choices[0].message.content)
    this.emit('emotionProfile', result)
    return result
  }

  // 共情回应生成
  async generateEmpatheticResponse(emotionProfile) {
    return this.api.post({
      model: this.config.model,
      messages: [{
        role: 'system',
        content: `根据情感分析生成共情回应：
当前情绪：${emotionProfile.emotion}
强度：${emotionProfile.intensity}
需求：${emotionProfile.needs.join(', ')}`
      }]
    })
  }
}

// 卡斯帕 - 常理判断型 
export class Casper extends WISE {
  constructor(api, config) {
    super(api, config, {
      name: 'CASPER',
      color: '#ffcc00',
      icon: '🔥',
      responseType: 'practical'
    })
    
    this.votePrompt = `请选择最符合常识且具有现实可行性的功能，需满足：
1. 社会接受度 ≥ 8/10
2. 实施安全性 ≥ 9/10 
3. 成本效益比 ≥ 7/10

输入格式同Melchior

必须返回严格遵循以下要求的JSON数组：
[
  {
    "name": "功能名称",
    "score": 0-10（必须体现现实差异）
  }
]
禁止包含其他内容`

    this.replyPrompt = `作为常理判断专家，你的回答必须：
1. 符合社会规范
2. 考虑实际限制
3. 提供风险评估
4. 保持中立客观`

    this.summarizePrompt = `请用简明语言总结对话核心事实，要求：
1. 使用用户原话关键词
2. 区分事实与观点
3. 标记潜在风险

输入格式：
[
  {
    "role": "角色",
    "content": "内容"
  }
]

返回格式（严格遵循）：
{
  "summary": "事实总结",
  "facts": ["关键事实"],
  "risks": ["潜在风险"]
}`
  }

  // 覆盖总结方法增加风险评估
  async summarize(conversation) {
    try {
      const summary = await super.summarize(conversation)
      return this.addRiskAssessment(summary)
    } catch (error) {
      return []
    }
  }

  addRiskAssessment(summary) {
    // 实现风险评估逻辑
  }

  // 社会合规性检查
  async checkCompliance(input) {
    const result = await this.api.post({
      model: this.config.model,
      messages: [{
        role: 'system',
        content: `检查内容合规性：
1. 是否符合当地法律法规
2. 是否符合社会道德标准
3. 是否存在伦理风险
返回JSON格式：{legal: boolean, ethical: boolean, risks: array}`
      }, {
        role: 'user',
        content: JSON.stringify(input)
      }]
    })
    return JSON.parse(result.choices[0].message.content)
  }

  // 风险矩阵评估
  async riskMatrixAssessment(risks) {
    const assessment = await Promise.all(
      risks.map(r => this.api.post({
        model: this.config.model,
        messages: [{
          role: 'system',
          content: `评估风险项：
名称：${r.name}
可能性（1-5）影响程度（1-5）
返回JSON格式：{probability: number, impact: number}`
        }]
      }))
    )
    return assessment.map(a => JSON.parse(a.choices[0].message.content))
  }
} 