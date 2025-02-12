const decisionPromptTemplate = {
  // 基础信息
  metadata: {
    version: "1.0",
    type: "decision_making",
    description: "用于复杂决策的提示词模板"
  },

  // 决策上下文
  context: {
    situation: "", // 当前情况描述
    background: "", // 背景信息
    constraints: [], // 约束条件列表
    resources: {}, // 可用资源
    previousDecisions: [] // 历史决策记录
  },

  // 决策参数
  parameters: {
    priority: {
      type: "enum",
      values: ["high", "medium", "low"],
      default: "medium"
    },
    timeFrame: {
      type: "string",
      format: "duration"
    },
    riskTolerance: {
      type: "number",
      range: [0, 1]
    }
  },

  // 期望输出格式
  expectedOutput: {
    decision: {
      recommendation: "string",
      reasoning: "string",
      alternatives: ["string"],
      risks: ["string"],
      nextSteps: ["string"]
    }
  },

  // 生成完整提示词
  generatePrompt(data) {
    return `
背景情况:
${data.context.situation}

需要考虑的约束:
${data.context.constraints.map(c => `- ${c}`).join('\n')}

可用资源:
${Object.entries(data.context.resources).map(([k,v]) => `- ${k}: ${v}`).join('\n')}

决策优先级: ${data.parameters.priority}
时间框架: ${data.parameters.timeFrame}
风险承受度: ${data.parameters.riskTolerance}

请提供:
1. 主要建议
2. 决策理由
3. 替代方案
4. 潜在风险
5. 后续步骤

请以JSON格式输出,符合以下结构:
${JSON.stringify(this.expectedOutput, null, 2)}
    `.trim()
  }
}

// 使用示例
const sampleData = {
  context: {
    situation: "需要在两周内完成新产品发布",
    constraints: ["预算限制", "人力资源有限"],
    resources: {
      budget: "100万",
      team: "5人"
    }
  },
  parameters: {
    priority: "high",
    timeFrame: "2周",
    riskTolerance: 0.3
  }
}

// 生成提示词
const prompt = decisionPromptTemplate.generatePrompt(sampleData) 