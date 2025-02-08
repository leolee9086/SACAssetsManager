export const trinityQuestions = [
  {
    title: '基础信息',
    systemTitle: `Marduk-${new Date().getTime()}`,
    description: '构建个体基础档案信息，包括身份标识与基础经历。',
    questions: [
      {
        text: '性别',
        type: 'single',
        options: ['女', '男', '其他'],
        selectedOption: '女',
        path: 'TRINITY.基础信息.性别',
        onChange: (value, questions) => {
          const nameQuestion = questions.find(q => q.path === 'TRINITY.基础信息.姓名');
          if (nameQuestion) {
            switch (value) {
              case '女':
                nameQuestion.value = 'REI';
                nameQuestion.placeholder = 'REI';
                break;
              case '男':
                nameQuestion.value = 'KAWORU';
                nameQuestion.placeholder = 'KAWORU';
                break;
              default:
                nameQuestion.value = '';
                nameQuestion.placeholder = '请输入姓名';
            }
          }
        },
        hint: '请选择适格者的生理性别，这将影响后续的个性化评估'
      },
      {
        text: '姓名',
        type: 'text',
        value: 'REI',
        placeholder: '请输入姓名',
        path: 'TRINITY.基础信息.姓名',
        hint: '输入适格者的标识名称，可以是代号或真实姓名'
      },
      {
        text: '年龄',
        type: 'text',
        value: '14',
        placeholder: '14',
        path: 'TRINITY.基础信息.年龄',
        hint: '请输入实际年龄，这将用于年龄相关的评估校准'
      },
      {
        text: '所属组织',
        type: 'text',
        value: 'NERV',
        path: 'TRINITY.基础信息.所属组织',
        hint: '填写适格者当前隶属的主要组织机构名称'
      },
      {
        text: '职责定位',
        type: 'text',
        value: '驾驶员',
        path: 'TRINITY.基础信息.职责',
        hint: '描述适格者在组织中的主要职责与角色定位'
      },
      {
        text: '关键经历',
        type: 'multiple_text',
        values: [],
        path: 'TRINITY.基础信息.关键经历',
        hint: '列举对适格者个性形成有重要影响的关键事件或经历'
      }
    ]
  },
  {
    title: '整合特征评估',
    systemTitle: 'TRINITY-00 整合特征倾向量表',
    description: '评估个体在认知、情感与行为三个维度的整合与平衡倾向。',
    questions: [
      {
        text: '决策模式倾向',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在做重要决定时，候选者倾向于：',
            type: 'single',
            options: [
              '完全依赖直觉判断',
              '优先考虑情感感受',
              '平衡理性与直觉',
              '倾向理性分析',
              '严格遵循逻辑推理'
            ],
            weight: 1.2,
            path: '整合特征.决策模式.思维倾向',
            hint: '评估决策时对理性、情感和直觉的依赖倾向'
          },
          {
            text: '面对复杂情境时，候选者的处理倾向：',
            type: 'single',
            options: [
              '完全依靠本能反应',
              '主要依据情感判断',
              '综合权衡多个维度',
              '建立系统分析框架',
              '追求最优理性方案'
            ],
            weight: 1.1,
            path: '整合特征.决策模式.处理倾向',
            hint: '评估处理复杂问题时的自然倾向'
          }
        ],
        hint: '评估个体在决策过程中的整合特征'
      },
      {
        text: '认知-情感平衡',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在信息处理时，候选者倾向于：',
            type: 'single',
            options: [
              '完全依赖感性认知',
              '优先情感印象',
              '理性情感并重',
              '强调逻辑分析',
              '纯粹理性思考'
            ],
            weight: 1.2,
            path: '整合特征.认知情感.处理倾向',
            hint: '评估理性与情感在认知过程中的平衡倾向'
          },
          {
            text: '在人际互动中，候选者表现出：',
            type: 'single',
            options: [
              '完全感性互动',
              '以情感为主导',
              '理性情感平衡',
              '理性分析为主',
              '高度理性克制'
            ],
            weight: 1,
            path: '整合特征.认知情感.互动倾向',
            hint: '评估社交互动中的理性情感平衡特征'
          }
        ],
        hint: '评估理性思维与情感体验的整合特征'
      },
      {
        text: '行为-认知协调',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在行动决策时，候选者倾向于：',
            type: 'single',
            options: [
              '完全直觉驱动',
              '优先感性判断',
              '直觉理性结合',
              '理性分析为主',
              '严格逻辑推理'
            ],
            weight: 1.1,
            path: '整合特征.行为认知.决策倾向',
            hint: '评估行动决策中的认知协调特征'
          },
          {
            text: '在执行任务时，候选者表现出：',
            type: 'single',
            options: [
              '完全自发行动',
              '以习惯为主导',
              '基本计划执行',
              '系统规划实施',
              '严格流程控制'
            ],
            weight: 1,
            path: '整合特征.行为认知.执行模式',
            hint: '评估任务执行中的认知协调特征'
          }
        ],
        hint: '评估行为与认知的协调特征'
      },
      {
        text: '情感-行为整合',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在情绪影响下，候选者的行为倾向：',
            type: 'single',
            options: [
              '完全情绪驱动',
              '以情感为主导',
              '情感理性平衡',
              '理性控制为主',
              '严格自我约束'
            ],
            weight: 1.2,
            path: '整合特征.情感行为.情绪影响',
            hint: '评估情绪对行为的影响程度'
          },
          {
            text: '在压力情境下，候选者的应对方式：',
            type: 'single',
            options: [
              '完全本能反应',
              '以直觉为主导',
              '本能理性结合',
              '保持理性思考',
              '强制理性控制'
            ],
            weight: 1.1,
            path: '整合特征.情感行为.压力应对',
            hint: '评估压力下的行为调节特征'
          }
        ],
        hint: '评估情感与行为的整合特征'
      },
      {
        text: '本能-理性整合',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '面对突发状况时，候选者倾向于：',
            type: 'single',
            options: [
              '完全本能反应',
              '优先直觉判断',
              '本能理性结合',
              '理性分析为主',
              '严格理性控制'
            ],
            weight: 1.2,
            path: '整合特征.本能理性.应急倾向',
            hint: '评估紧急情况下本能与理性的整合特征'
          },
          {
            text: '在压力情境下，候选者表现出：',
            type: 'single',
            options: [
              '完全本能驱动',
              '以直觉为主导',
              '本能理性平衡',
              '保持理性思考',
              '强制理性控制'
            ],
            weight: 1.1,
            path: '整合特征.本能理性.压力应对',
            hint: '评估压力下本能与理性的平衡特征'
          }
        ],
        hint: '评估本能反应与理性思维的整合特征'
      },
      {
        text: '适应性整合',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '面对新环境时，候选者倾向于：',
            type: 'single',
            options: [
              '完全依赖本能适应',
              '感性体验为主',
              '多维度综合适应',
              '理性分析为主',
              '系统性规划适应'
            ],
            weight: 1,
            path: '整合特征.适应性.环境适应',
            hint: '评估环境适应过程中的整合特征'
          },
          {
            text: '在角色转换时，候选者表现出：',
            type: 'single',
            options: [
              '本能式转换',
              '情感导向调整',
              '综合平衡转换',
              '理性规划调整',
              '系统性重构'
            ],
            weight: 1,
            path: '整合特征.适应性.角色转换',
            hint: '评估角色转换时的整合特征'
          }
        ],
        hint: '评估适应过程中的整合特征'
      },
      {
        text: '发展整合倾向',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在个人发展方向选择上，候选者倾向于：',
            type: 'single',
            options: [
              '完全跟随直觉',
              '以兴趣为导向',
              '多维度平衡',
              '理性规划为主',
              '严格系统规划'
            ],
            weight: 1.2,
            path: '整合特征.发展整合.方向选择',
            hint: '评估发展方向选择时的整合特征'
          },
          {
            text: '在能力提升过程中，候选者表现出：',
            type: 'single',
            options: [
              '随性自然发展',
              '兴趣驱动学习',
              '均衡发展取向',
              '系统性学习',
              '严格执行计划'
            ],
            weight: 1,
            path: '整合特征.发展整合.学习方式',
            hint: '评估学习发展过程中的整合特征'
          }
        ],
        hint: '评估个人发展过程中的整合特征'
      }
    ]
  },
  {
    title: '标识信息',
    systemTitle: 'TRINITY-00 基础信息采集',
    description: '用于构建个体基础特征档案，包括外显特征与识别标记。',
    questions: [
      { 
        text: '体态特征', 
        type: 'text',
        value: '',
        placeholder: '请输入体态特征描述',
        path: '标识信息.外显特征.体态',
        hint: '描述适格者当前体态特征，如：纤细、标准、强壮等'
      },
      { 
        text: '显著标记', 
        type: 'text',
        value: '',
        placeholder: '请输入显著标记描述',
        path: '标识信息.外显特征.显著标记',
        hint: '描述适格者具有的明显外观特征，如：蓝发、红瞳等'
      },
      { 
        text: '识别特征', 
        type: 'text',
        value: '',
        placeholder: '请输入识别特征描述',
        path: '标识信息.外显特征.识别特征',
        hint: '描述可用于识别的特殊标记或行为特征，如：左臂绷带、轻微体颤等'
      },
      {
        text: '性格特征 - 内向程度',
        type: 'text',
        value: '',
        placeholder: '请输入性格内向程度描述',
        path: '完整人格.基础信息.性格特征.内向程度',
        hint: '描述适格者在社交场合的倾向性，如：极度内向、偏外向等'
      },
      {
        text: '表达方式',
        type: 'text',
        value: '',
        placeholder: '请输入表达方式描述',
        path: '完整人格.基础信息.性格特征.表达方式',
        hint: '描述适格者惯用的沟通表达方式，如：简洁含蓄、热情开放等'
      },
      {
        text: '生活环境',
        type: 'text',
        value: '',
        placeholder: '请输入生活环境描述',
        path: '标识信息.周边特征.生活环境',
        hint: '描述适格者的主要生活环境特征，包括居住类型、社区特征、环境安全等级等。示例：居住于第三新东京市A级安全区的高层公寓，周边配套设施完善，环境安全等级为B+'
      },
      {
        text: '活动模式',
        type: 'text',
        value: '',
        placeholder: '请输入活动模式描述',
        path: '标识信息.周边特征.活动模式',
        hint: '描述适格者的日常活动规律，包括通勤方式、主要活动区域、活动半径等。示例：主要活动范围为NERV总部至第三新东京市第3区，活动半径5公里，以轨道交通为主要通勤方式，日均通勤时间45分钟'
      },
      {
        text: '社交网络',
        type: 'text',
        value: '',
        placeholder: '请输入社交网络描述',
        path: '标识信息.周边特征.社交网络',
        hint: '描述适格者的社交关系特征，包括主要社交对象、互动频率、社交圈层等。示例：主要与NERV同事保持工作关系，日常社交互动较少，社交圈层集中在专业领域，平均每周社交活动2-3次'
      },
      {
        text: '作息规律',
        type: 'text',
        value: '',
        placeholder: '请输入作息规律描述',
        path: '标识信息.周边特征.作息规律',
        hint: '描述适格者的作息特征，包括睡眠时间、工作时段、休息规律等。示例：工作日7:00-22:00在NERV总部，周末基本保持相同作息，平均睡眠时间6.5小时，午休时间30分钟'
      }
    ]
  },
  {
    title: '角色定位评估',
    systemTitle: 'TRINITY-01 角色定位描述量表',
    description: '评估个体在不同场景中的角色定位与功能特征。',
    questions: [
      {
        text: '职业角色描述',
        type: 'multiple_text',
        values: [],
        path: '角色定位.职业角色',
        hint: '请描述候选者在职业场景中的主要角色定位，格式：角色名称: 简要职责描述。例如：数据分析师: 负责分析自然环境数据',
        placeholder: '请输入职业角色描述',
        validation: {
          pattern: /^[^:]+:.+$/,
          message: '请输入正确的格式：角色名称: 简要职责描述'
        }
      },
      {
        text: '社交角色描述',
        type: 'multiple_text',
        values: [],
        path: '角色定位.社交角色',
        hint: '请描述候选者在社交场景中的主要角色定位，格式：角色名称: 简要特征描述。例如：团队协调者: 负责协调团队成员关系',
        placeholder: '请输入社交角色描述',
        validation: {
          pattern: /^[^:]+:.+$/,
          message: '请输入正确的格式：角色名称: 简要特征描述'
        }
      },
      {
        text: '自我认知角色描述',
        type: 'multiple_text',
        values: [],
        path: '角色定位.自我认知',
        hint: '请描述候选者的自我认知角色定位，格式：角色名称: 简要自我描述。例如：探索者: 对未知领域充满好奇心',
        placeholder: '请输入自我认知角色描述',
        validation: {
          pattern: /^[^:]+:.+$/,
          message: '请输入正确的格式：角色名称: 简要自我描述'
        }
      }
    ]
  }
];

export const genSummaryPrompt = (data) => {
  const {
    // 基础信息
    姓名 = '',
    年龄 = '',
    性别 = '',
    所属组织 = '',
    职责定位 = '',
    关键经历 = [],
    // 决策模式
    决策模式得分 = 0,
    思维倾向特征 = '',
    处理倾向特征 = '',
    // 认知情感平衡
    认知情感得分 = 0,
    互动倾向特征 = '',
    // 本能理性整合
    本能理性得分 = 0,
    应急倾向特征 = '',
    压力应对特征 = '',
    // 适应性整合
    适应性得分 = 0,
    环境适应特征 = '',
    角色转换特征 = '',
    // 发展整合
    发展整合得分 = 0,
    方向选择特征 = '',
    学习方式特征 = ''
  } = data;

  return `
请根据以下资料，以侧写模拟的形式,生成候选者 ${姓名} 的第一人称陈述,由于模拟其完整人格特质：

基础档案：
姓名：${姓名}
年龄：${年龄}岁
性别：${性别}
所属：${所属组织}
职责：${职责定位}

关键经历：
${关键经历.map((exp, index) => `${index + 1}. ${exp}`).join('\n')}

整合特征评估：
1. 决策模式（${决策模式得分}分）：
   - 思维倾向：${思维倾向特征}
   - 处理倾向：${处理倾向特征}

2. 认知情感平衡（${认知情感得分}分）：
   - 互动倾向：${互动倾向特征}

3. 本能理性整合（${本能理性得分}分）：
   - 应急倾向：${应急倾向特征}
   - 压力应对：${压力应对特征}

4. 适应性整合（${适应性得分}分）：
   - 环境适应：${环境适应特征}
   - 角色转换：${角色转换特征}

5. 发展整合（${发展整合得分}分）：
   - 方向选择：${方向选择特征}
   - 学习方式：${学习方式特征}

自我介绍要求：
1. 内容结构：
   - 以"我是 ${姓名} ,MAGI整合模拟,我将负责以最符合${姓名}档案的方式模拟${姓名},整合各个侧面的分析结果"开始,以"因此我在对话中将综合所有分析结果,<行为准则>"结束，介绍自己的身份

2. 表达特点：
   - 严格使用第一人称叙述
   - 完全基于已知档案信息
   - 不添加档案之外的设定
   - 保持整合特征一致性
   - 绝对确保陈述符合角色要求



注意事项：
- 仅使用档案中提供的信息
- 避免过度推测和想象
- 保持特征描述前后一致
- 符合年龄和职责特征
- 在体现人物特征的基础上尽可能简短,介绍自身而不是档案内容
- 绝对禁止按照分点重复档案内容,介绍自身而不是档案内容
- 以语言记录而不是"自我介绍"的方式进行
`;
}; 