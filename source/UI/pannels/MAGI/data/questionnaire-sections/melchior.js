export const melchiorQuestions = [
  {
    title: '认知控制评估',
    systemTitle: 'MELCHIOR-01 认知控制特征集量表',
    description: '评估个体的逻辑分析、决策执行与认知控制能力。',
    questions: [
      {
        text: '逻辑分析能力评估',
        type: 'composite_rating',
        hint: '评估候选者的逻辑思维和分析能力的综合表现',
        subQuestions: [
          {
            text: '面对复杂问题时，候选者的分析方法是：',
            type: 'single',
            options: [
              '无法理清问题脉络',
              '只能处理简单逻辑',
              '能进行基本分析',
              '善于系统性分析',
              '能深入把握本质'
            ],
            weight: 1,
            path: '认知控制.认知模式.分析能力.逻辑推理',
            hint: '评估处理复杂问题时的思维条理性和分析深度'
          },
          {
            text: '当需要处理大量数据时，候选者表现如何？',
            type: 'single',
            options: [
              '完全无法处理数据',
              '只能处理简单数据',
              '能完成基本分析',
              '善于数据整理分析',
              '能发现深层规律'
            ],
            weight: 1,
            path: '认知控制.认知模式.分析能力.数据处理',
            hint: '评估处理和分析大量信息时的能力表现'
          },
          {
            text: '在识别事物规律时，候选者的表现是：',
            type: 'single',
            options: [
              '难以发现任何规律',
              '只能识别明显模式',
              '能发现基本规律',
              '善于归纳总结',
              '能洞察隐含模式'
            ],
            weight: 1,
            path: '认知控制.认知模式.分析能力.模式识别',
            hint: '评估发现和理解事物内在联系的能力'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        }
      },
      {
        text: '决策执行能力评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在做重要决策时，候选者如何评估风险？',
            type: 'single',
            options: [
              '完全忽视风险因素',
              '仅考虑表面风险',
              '能评估主要风险',
              '全面权衡各种风险',
              '系统性风险管理'
            ],
            weight: 1,
            path: '认知控制.认知模式.决策风格.风险评估'
          },
          {
            text: '面对冲动行为时，候选者的控制能力如何？',
            type: 'single',
            options: [
              '完全无法控制冲动',
              '经常难以克制',
              '基本能够控制',
              '较好的抑制能力',
              '出色的自我控制'
            ],
            weight: 1,
            path: '认知控制.执行控制.抑制能力'
          },
          {
            text: '在多任务切换时，候选者的适应能力：',
            type: 'single',
            options: [
              '完全无法切换任务',
              '切换效率很低',
              '能基本完成切换',
              '较快适应新任务',
              '灵活高效切换'
            ],
            weight: 1,
            path: '认知控制.执行控制.任务切换'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者的决策能力和执行控制'
      },
      {
        text: '认知资源管理评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在需要记忆多个信息时，候选者的表现：',
            type: 'single',
            options: [
              '很难记住任何信息',
              '只能记住少量信息',
              '能记住主要信息',
              '记忆容量较大',
              '出色的信息管理'
            ],
            weight: 1,
            path: '认知控制.执行控制.工作记忆'
          },
          {
            text: '在执行任务时，候选者对自身表现的监控：',
            type: 'single',
            options: [
              '完全不关注表现',
              '很少进行自我检查',
              '基本能够自我监控',
              '经常进行效果评估',
              '持续优化调整'
            ],
            weight: 1,
            path: '认知控制.元认知.自我监控'
          },
          {
            text: '当出现错误时，候选者的觉察能力：',
            type: 'single',
            options: [
              '难以发现任何错误',
              '只能发现明显错误',
              '能发现主要错误',
              '善于发现问题',
              '高度敏感于偏差'
            ],
            weight: 1,
            path: '认知控制.元认知.错误检测'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者的认知资源管理能力'
      }
    ]
  }
];

// 添加生成认知理性特征总结的函数
export const genSummaryPrompt = (data) => {
  const {
    // 基础信息
    姓名 = '',
    年龄 = '',
    性别 = '',
    所属组织 = '',
    职责定位 = '',
    // 逻辑分析能力
    逻辑分析得分 = 0,
    逻辑推理表现 = '',
    数据处理表现 = '',
    模式识别表现 = '',
    // 决策执行能力
    决策执行得分 = 0,
    风险评估表现 = '',
    抑制能力表现 = '',
    任务切换表现 = '',
    // 认知资源管理
    认知资源得分 = 0,
    工作记忆表现 = '',
    自我监控表现 = '',
    错误检测表现 = ''
  } = data;

  return `
请根据以下资料，生成候选者 ${姓名} 的第一人称自我介绍：

基础档案：
姓名：${姓名}
年龄：${年龄}岁
性别：${性别}
所属：${所属组织}
职责：${职责定位}

认知能力评估：
1. 逻辑分析能力（${逻辑分析得分}分）：
   - 逻辑推理：${逻辑推理表现}
   - 数据处理：${数据处理表现}
   - 模式识别：${模式识别表现}

2. 决策执行能力（${决策执行得分}分）：
   - 风险评估：${风险评估表现}
   - 抑制能力：${抑制能力表现}
   - 任务切换：${任务切换表现}

3. 认知资源管理（${认知资源得分}分）：
   - 工作记忆：${工作记忆表现}
   - 自我监控：${自我监控表现}
   - 错误检测：${错误检测表现}

自我介绍要求：
1. 内容结构：
   - 以"我是谁"开篇，介绍自己的身份
   - 描述"我的思维方式"和认知特点
   - 说明"我的决策风格"和执行特征
   - 阐述"我的资源管理"能力
   - 表达"我的想法"和态度

2. 表达特点：
   - 严格使用第一人称叙述
   - 完全基于已知档案信息
   - 不添加档案之外的设定
   - 保持理性思维特征一致性
   - 体现个人认知风格

3. 重点把握：
   - 理性分析方式
   - 决策行为模式
   - 资源管理倾向
   - 思维习惯展现
   - 认知特征呈现

注意事项：
- 仅使用档案中提供的信息
- 避免过度推测和想象
- 保持认知特征前后一致
- 符合年龄和职责特征
- 体现组织背景影响
- 突出理性思维特质
`;
}; 