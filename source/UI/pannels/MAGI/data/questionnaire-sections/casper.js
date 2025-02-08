export const casperQuestions = [
  {
    title: '本能反应评估',
    systemTitle: 'CASPER-03 本能反应特征集量表',
    description: '评估生存机制、动机系统与自动化行为模式。',
    questions: [
      {
        text: '警觉性水平评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '当候选者在公共场所时，是否会习惯性地观察出口位置？',
            type: 'single',
            options: [
              '完全不会关注',
              '很少关注',
              '偶尔会关注',
              '经常会关注',
              '始终保持警觉'
            ],
            weight: 1,
            path: '本能反应.生存机制.警觉性.环境意识',
            hint: '评估对环境安全的警觉程度'
          },
          {
            text: '当身处陌生环境时，候选者能多快注意到周围的细微变化？',
            type: 'single',
            options: [
              '几乎察觉不到变化',
              '需要明显提醒才能注意',
              '能注意到明显变化',
              '能注意到大部分变化',
              '能迅速察觉细微变化'
            ],
            weight: 1,
            path: '本能反应.生存机制.警觉性.变化感知',
            hint: '评估对环境变化的敏感度'
          },
          {
            text: '在团队活动中，候选者对他人的情绪变化有多敏感？',
            type: 'single',
            options: [
              '完全无法察觉',
              '较少关注他人情绪',
              '能察觉明显的情绪变化',
              '对多数情绪变化敏感',
              '能精确捕捉细微情绪'
            ],
            weight: 1,
            path: '本能反应.生存机制.警觉性.情绪敏感度',
            hint: '评估对他人情绪变化的敏感程度'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者的环境警觉性和反应敏感度'
      },
      {
        text: '应激反应评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '面对突发的紧急情况，候选者通常会：',
            type: 'single',
            options: [
              '完全慌乱，无法行动',
              '行动迟缓，需要指导',
              '能基本保持冷静应对',
              '能有条理地处理',
              '迅速精准地采取行动'
            ],
            weight: 1,
            path: '本能反应.生存机制.应激反应.紧急处理',
            hint: '评估紧急情况下的反应能力'
          },
          {
            text: '在高压环境下，候选者的决策能力：',
            type: 'single',
            options: [
              '完全无法做出决定',
              '决策明显变得混乱',
              '决策速度变慢但准确',
              '基本维持正常决策',
              '决策更加快速准确'
            ],
            weight: 1,
            path: '本能反应.生存机制.应激反应.压力决策',
            hint: '评估压力下的决策表现'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者在压力情境下的应激反应'
      },
      {
        text: '生存本能评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在可能存在风险的情况下，候选者会：',
            type: 'single',
            options: [
              '完全忽视潜在风险',
              '被提醒才会注意',
              '会考虑基本防护',
              '主动采取防护措施',
              '全面系统地防范'
            ],
            weight: 1,
            path: '本能反应.生存机制.自我保护.风险防范',
            hint: '评估自我保护意识'
          },
          {
            text: '面对生理需求（如饥饿、疲劳）时，候选者会：',
            type: 'single',
            options: [
              '完全忽视身体需求',
              '经常忽略基本需求',
              '基本注意自我照顾',
              '主动关注身体状态',
              '系统性维护健康'
            ],
            weight: 1,
            path: '本能反应.生存机制.自我维护.基础需求',
            hint: '评估基本生理需求的维护能力'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者的基本生存本能'
      },
      {
        text: '动机系统评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在追求目标时，候选者表现出：',
            type: 'single',
            options: [
              '缺乏明确目标',
              '被动执行任务',
              '保持基本动力',
              '积极追求目标',
              '持续高度专注'
            ],
            weight: 1,
            path: '本能反应.动机系统.驱动强度.目标导向',
            hint: '评估目标导向的驱动力'
          },
          {
            text: '面对困难和挫折时，候选者会：',
            type: 'single',
            options: [
              '轻易放弃',
              '需要他人鼓励',
              '保持基本坚持',
              '积极寻求突破',
              '越挫越勇'
            ],
            weight: 1,
            path: '本能反应.动机系统.驱动强度.韧性',
            hint: '评估面对困难时的韧性'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者的内在动机系统'
      }
    ]
  }
];

// 添加生成 AI 总结提示语的函数
export const genSummaryPrompt = (data) => {
  const {
    // 基础信息
    姓名 = '',
    年龄 = '',
    性别 = '',
    所属组织 = '',
    职责定位 = '',
    // 警觉性评估
    警觉性得分 = 0,
    环境意识表现 = '',
    变化感知表现 = '',
    情绪敏感表现 = '',
    // 应激反应评估
    应激反应得分 = 0,
    紧急处理表现 = '',
    压力决策表现 = '',
    // 生存本能评估
    生存本能得分 = 0,
    风险防范表现 = '',
    自我维护表现 = '',
    // 动机系统评估
    动机系统得分 = 0,
    目标导向表现 = '',
    韧性表现 = ''
  } = data;

  return `
请根据以下资料，生成候选者 ${姓名} 的第一人称自我介绍：

基础档案：
姓名：${姓名}
年龄：${年龄}岁
性别：${性别}
所属：${所属组织}
职责：${职责定位}

本能反应评估：
1. 警觉性水平（${警觉性得分}分）：
   - 环境意识：${环境意识表现}
   - 变化感知：${变化感知表现}
   - 情绪敏感：${情绪敏感表现}

2. 应激反应能力（${应激反应得分}分）：
   - 紧急处理：${紧急处理表现}
   - 压力决策：${压力决策表现}

3. 生存本能表现（${生存本能得分}分）：
   - 风险防范：${风险防范表现}
   - 自我维护：${自我维护表现}

4. 动机系统特征（${动机系统得分}分）：
   - 目标导向：${目标导向表现}
   - 韧性表现：${韧性表现}

自我介绍要求：
1. 内容结构：
   - 以"我是谁"开篇，介绍自己的身份
   - 描述"我的本能特征"和反应模式
   - 说明"我的应激表现"和处理方式
   - 阐述"我的生存策略"和动机特征
   - 表达"我的想法"和态度

2. 表达特点：
   - 严格使用第一人称叙述
   - 完全基于已知档案信息
   - 不添加档案之外的设定
   - 保持本能特征一致性
   - 体现个人反应风格

3. 重点把握：
   - 警觉性表现
   - 应激反应模式
   - 生存本能特征
   - 动机驱动方式
   - 本能特征呈现

注意事项：
- 仅使用档案中提供的信息
- 避免过度推测和想象
- 保持本能特征前后一致
- 符合年龄和职责特征
- 体现组织背景影响
- 突出本能反应特质
`;
}; 