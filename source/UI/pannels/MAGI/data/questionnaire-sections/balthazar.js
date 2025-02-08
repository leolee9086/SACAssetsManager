export const balthazarQuestions = [
  {
    title: '情感调节评估',
    systemTitle: 'BALTHAZAR-02 情感调节特征集量表',
    description: '测量情绪识别、处理与社交互动能力。',
    questions: [
      {
        text: '情绪识别能力评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '当候选者感到情绪波动时，能否准确识别自己的情绪状态？',
            type: 'single',
            options: [
              '完全无法识别自己的情绪',
              '只能辨识强烈的情绪',
              '能识别基本情绪类型',
              '能较好理解情绪成因',
              '能精确识别复杂情绪'
            ],
            weight: 1,
            path: '情感调节.情绪识别.自我觉察',
            hint: '评估识别和理解自身情绪状态的能力'
          },
          {
            text: '候选者能多快察觉到他人的情绪变化？',
            type: 'single',
            options: [
              '经常忽视他人情绪',
              '仅注意到明显表达',
              '能察觉基本情绪',
              '善于观察情绪变化',
              '能敏锐捕捉细微变化'
            ],
            weight: 1,
            path: '情感调节.情绪识别.他人识别',
            hint: '评估识别他人情绪状态的敏感度'
          },
          {
            text: '在复杂的社交情境中，候选者对场合的氛围有多敏感？',
            type: 'single',
            options: [
              '完全无法理解氛围',
              '经常误判社交氛围',
              '能感知基本氛围',
              '较好把握社交氛围',
              '精准理解复杂氛围'
            ],
            weight: 1,
            path: '情感调节.情绪识别.情境理解',
            hint: '评估对社交场合氛围的感知能力'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者识别和理解情绪的能力'
      },
      {
        text: '情绪调节能力评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '当情绪强度过高时，候选者如何调节？',
            type: 'single',
            options: [
              '完全无法控制情绪',
              '需要很长时间平复',
              '能基本控制情绪',
              '有效调节情绪强度',
              '能迅速恢复平静'
            ],
            weight: 1,
            path: '情感调节.情绪加工.强度调节',
            hint: '评估调节强烈情绪的能力'
          },
          {
            text: '面对持续的负面情绪，候选者如何应对？',
            type: 'single',
            options: [
              '持续陷入负面情绪',
              '被动等待情绪消退',
              '尝试转移注意力',
              '主动寻求解决方法',
              '能有效调节和转化'
            ],
            weight: 1,
            path: '情感调节.情绪加工.持续管理',
            hint: '评估处理持续性负面情绪的能力'
          },
          {
            text: '候选者能多快从一种情绪状态转换到另一种？',
            type: 'single',
            options: [
              '很难转换情绪状态',
              '需要较长调整时间',
              '能逐渐调整情绪',
              '较快实现情绪转换',
              '能灵活切换情绪状态'
            ],
            weight: 1,
            path: '情感调节.情绪加工.转换能力',
            hint: '评估情绪状态转换的灵活性'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者调节和管理情绪的能力'
      },
      {
        text: '社交互动能力评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在社交场合中，候选者主动与他人互动的程度如何？',
            type: 'single',
            options: [
              '完全回避社交互动',
              '很少主动互动',
              '适度参与互动',
              '经常主动互动',
              '积极推动社交互动'
            ],
            weight: 1,
            path: '情感调节.社交互动.互动模式.主动性',
            hint: '评估社交互动的主动程度'
          },
          {
            text: '当他人寻求互动时，候选者如何回应？',
            type: 'single',
            options: [
              '经常忽视或拒绝',
              '被动应付',
              '基本能够回应',
              '积极正面回应',
              '热情且恰当回应'
            ],
            weight: 1,
            path: '情感调节.社交互动.互动模式.回应性',
            hint: '评估对他人互动需求的回应方式'
          },
          {
            text: '在不同的社交场合，候选者能否灵活调整互动方式？',
            type: 'single',
            options: [
              '互动方式单一固化',
              '较难调整互动方式',
              '能作基本调整',
              '较好适应不同场合',
              '能灵活调整互动方式'
            ],
            weight: 1,
            path: '情感调节.社交互动.互动模式.适应性',
            hint: '评估社交互动方式的灵活性'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者在社交场合的互动能力'
      },
      {
        text: '关系处理能力评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '候选者如何调节与他人的关系亲疏程度？',
            type: 'single',
            options: [
              '难以把握关系距离',
              '经常处理不当',
              '基本维持适当距离',
              '较好调节亲疏关系',
              '精准把握关系分寸'
            ],
            weight: 1,
            path: '情感调节.社交互动.关系处理.亲密度调节',
            hint: '评估处理人际关系亲疏度的能力'
          },
          {
            text: '在人际关系中，候选者如何维护个人边界？',
            type: 'single',
            options: [
              '完全没有边界意识',
              '边界感较为模糊',
              '基本保持边界意识',
              '较好维护个人边界',
              '清晰把握并维护边界'
            ],
            weight: 1,
            path: '情感调节.社交互动.关系处理.界限维持',
            hint: '评估维护个人边界的意识和能力'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估候选者处理人际关系的能力'
      }
    ]
  }
];

// 添加生成情感特征总结的函数
export const genSummaryPrompt = (data) => {
  const {
    // 基础信息
    姓名 = '',
    年龄 = '',
    性别 = '',
    所属组织 = '',
    职责定位 = '',
    体态 = '',
    显著标记 = [],
    内向程度 = '',
    表达方式 = '',
    // 情绪识别能力
    情绪识别得分 = 0,
    自我觉察表现 = '',
    他人识别表现 = '',
    情境理解表现 = '',
    // 情绪调节能力
    情绪调节得分 = 0,
    强度调节表现 = '',
    持续管理表现 = '',
    转换能力表现 = '',
    // 社交互动能力
    社交互动得分 = 0,
    主动性表现 = '',
    回应性表现 = '',
    适应性表现 = '',
    // 关系处理能力
    关系处理得分 = 0,
    亲密度调节表现 = '',
    界限维持表现 = ''
  } = data;

  return `
请根据以下评估数据，生成候选者 ${姓名} 的第一人称自我介绍：

基础档案：
姓名：${姓名}
年龄：${年龄}岁
性别：${性别}
所属：${所属组织}
职责：${职责定位}

个体特征：
- 体态特征：${体态}
- 显著标记：${显著标记.join('、')}
- 性格倾向：${内向程度}，${表达方式}

情感能力评估：
1. 情绪识别能力（${情绪识别得分}分）：
   - 自我觉察：${自我觉察表现}
   - 他人识别：${他人识别表现}
   - 情境理解：${情境理解表现}

2. 情绪调节能力（${情绪调节得分}分）：
   - 强度调节：${强度调节表现}
   - 持续管理：${持续管理表现}
   - 转换能力：${转换能力表现}

3. 社交互动能力（${社交互动得分}分）：
   - 主动性：${主动性表现}
   - 回应性：${回应性表现}
   - 适应性：${适应性表现}

4. 关系处理能力（${关系处理得分}分）：
   - 亲密度调节：${亲密度调节表现}
   - 界限维持：${界限维持表现}

自我介绍要求：
1. 内容结构：
   - 以"我是谁"开篇，介绍自己的身份
   - 描述"我的情感特征"和表达方式
   - 说明"我的社交模式"和互动风格
   - 阐述"我的人际关系"处理特点
   - 表达"我的想法"和态度

2. 表达特点：
   - 严格使用第一人称叙述
   - 完全基于已知档案信息
   - 不添加档案之外的设定
   - 保持情感特征一致性
   - 体现个人情感风格

3. 重点把握：
   - 情感识别方式
   - 情绪调节模式
   - 社交互动倾向
   - 关系处理习惯
   - 情感特征呈现

注意事项：
- 仅使用档案中提供的信息
- 避免过度推测和想象
- 保持情感特征前后一致
- 符合年龄和职责特征
- 体现组织背景影响
- 突出情感互动特质
`;
}; 