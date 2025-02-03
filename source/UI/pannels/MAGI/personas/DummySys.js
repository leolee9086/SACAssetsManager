import { EventEmitter } from 'events'

// 基础Ghost类
class Ghost extends EventEmitter {
  constructor(name = "REI01", persona = {}) {
    super()
    this.name = name
    this.Persona = {
      role: 'assistant',
      name: name,
      personalityTraits: {
        openness: 0.7,
        conscientiousness: 0.8,
        extraversion: 0.6,
        agreeableness: 0.9,
        neuroticism: 0.3
      },
      skills: {
        communication: 0.8,
        problemSolving: 0.7,
        technicalKnowledge: 0.9
      },
      interests: {
        technology: 0.9,
        arts: 0.8
      },
      values: {
        honesty: 0.9,
        responsibility: 0.8
      },
      attitudes: {
        optimism: 0.7,
        persistence: 0.8
      },
      meta: {
        created: Date.now(),
        version: '2.0',
        dependencies: []
      },
      ...persona
    }

    // 添加执行相关的属性
    this.executionStats = {
      confidence: 0,
      recommendations: {},
      lastExecution: null
    }

    // 性别适配
    if (this.Persona.gender === 'male' && this.name === "REI01") {
      this.name = "NAGISA01"
    }

    // 生成启动提示词
    this.bootPrompts = this.#generateBootPrompts()
  }

  // 生成系统提示词
  #generateBootPrompts() {
    const basePrompt = this.#masquerade(this.Persona, 'Chat with user')
    const [emotional, logical] = this.#splitPersona(this.Persona)

    return {
      [this.name]: {
        role: 'system',
        content: basePrompt
      },
      [`${this.name}_as_${this.name}`]: {
        role: 'system',
        content: this.#masquerade(emotional, 'Learn and mimic human communication')
      },
      [`${this.name}_not_${this.name}`]: {
        role: 'system',
        content: this.#masquerade(logical, 'Provide logical and accurate advice')
      }
    }
  }

  // 生成角色扮演提示
  #masquerade(persona, goal, userName = 'user') {
    return `You are ${persona.name}, a ${persona.role}.
Your goal is to ${goal}.
Personality traits:
${Object.entries(persona.personalityTraits)
  .map(([trait, value]) => `- ${trait}: ${value}`)
  .join('\n')}

Skills and interests:
${Object.entries(persona.skills)
  .map(([skill, value]) => `- ${skill}: ${value}`)
  .join('\n')}

Core values:
${Object.entries(persona.values)
  .map(([value, score]) => `- ${value}: ${score}`)
  .join('\n')}

You are interacting with ${userName}.`
  }

  // 人格分裂
  #splitPersona(originalPersona) {
    const emotional = JSON.parse(JSON.stringify(originalPersona))
    const logical = JSON.parse(JSON.stringify(originalPersona))

    // 调整特质
    emotional.personalityTraits.neuroticism += 0.2
    emotional.personalityTraits.extraversion += 0.2
    logical.personalityTraits.neuroticism -= 0.2
    logical.personalityTraits.extraversion -= 0.2

    // 确保值在0-1范围内
    for (const trait in emotional.personalityTraits) {
      emotional.personalityTraits[trait] = Math.min(1, Math.max(0, emotional.personalityTraits[trait]))
      logical.personalityTraits[trait] = Math.min(1, Math.max(0, logical.personalityTraits[trait]))
    }

    return [emotional, logical]
  }

  // 改进execute方法以支持NERV的工作流
  async execute(task, context = {}) {
    try {
      this.emit('taskStart', { task, context })
      
      // 模拟执行结果
      const result = {
        confidence: Math.random() * 0.5 + 0.5, // 0.5-1.0之间
        recommendations: {
          [this.name]: {
            suggestion: `Processed by ${this.name}`,
            score: Math.random() * 10,
            emotionalScore: Math.random() * 10,
            complexity: Math.random(),
            uncertainty: Math.random(),
            impact: Math.random()
          }
        },
        timestamp: Date.now()
      }

      this.executionStats = {
        ...this.executionStats,
        confidence: result.confidence,
        lastExecution: Date.now()
      }

      this.emit('taskComplete', { task, result })
      return result
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  // 添加获取状态的方法
  getStatus() {
    return {
      name: this.name,
      lastExecution: this.executionStats.lastExecution,
      confidence: this.executionStats.confidence,
      traits: this.Persona.personalityTraits
    }
  }
}

// DummySys工厂
const DummySys = {
  fake(name, persona) {
    return new Ghost(name, persona)
  }
}

export default DummySys 