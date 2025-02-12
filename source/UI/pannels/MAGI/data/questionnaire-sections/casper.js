/**
 * 
负责直觉决策、主观判断和自身情绪。以个体的自我意识|本能|自我为基础
特点:在决策中提供个体自身的主观考虑和情绪，确保决策的独特性
量表特征:评估理性决策时的考虑倾向,例如风险平衡和宽容性,重点在于倾向和结构而不是能力
特点：在决策中更注重直觉和个人情感，有时会表现出较强的主观性。
 */
export const casperQuestions = [
  {
    title: '本能反应评估',
    systemTitle: 'CASPER-03 本能反应特征集量表',
    description: '评估生存机制、动机系统与自动化行为模式。',
    questions: [
      {
        text: '本能反应评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在公共场所时，候选者的注意力倾向是：',
            type: 'single',
            options: [
              '专注于当前活动',
              '被提醒才会环顾',
              '定期检查环境',
              '持续观察周围',
              '保持全面警戒'
            ],
            weight: 1,
            path: '本能反应.生存机制.警觉性.环境意识',
            hint: '评估环境安全意识的自然倾向'
          },
          {
            text: '在陌生环境中，候选者对变化的关注倾向：',
            type: 'single',
            options: [
              '专注于既定目标',
              '被动接收信息',
              '保持基本观察',
              '主动搜索变化',
              '持续扫描环境'
            ],
            weight: 1,
            path: '本能反应.生存机制.警觉性.变化感知',
            hint: '评估对环境变化的自然关注倾向'
          },
          {
            text: '在团队互动中，候选者对他人情绪的关注倾向：',
            type: 'single',
            options: [
              '专注于任务本身',
              '被提醒才会注意',
              '保持基本关注',
              '主动观察情绪',
              '持续追踪变化'
            ],
            weight: 1,
            path: '本能反应.生存机制.警觉性.情绪敏感度',
            hint: '评估对情绪变化的自然关注倾向'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估个体的自然警觉倾向与注意力分配模式'
      },
      {
        text: '应激反应倾向评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '面对突发情况时，候选者的第一反应倾向是：',
            type: 'single',
            options: [
              '寻求他人指导',
              '遵循既有流程',
              '快速评估局势',
              '立即采取行动',
              '系统性应对'
            ],
            weight: 1.2,
            path: '本能反应.生存机制.应激反应.紧急处理',
            hint: '评估紧急情况下的自然反应模式'
          },
          {
            text: '在高压环境下，候选者的决策倾向是：',
            type: 'single',
            options: [
              '回避做出决定',
              '寻求他人建议',
              '依据经验判断',
              '快速权衡利弊',
              '系统分析决策'
            ],
            weight: 1.1,
            path: '本能反应.生存机制.应激反应.压力决策',
            hint: '评估压力下的决策倾向'
          },
          {
            text: '面对意外变化时，候选者的适应倾向是：',
            type: 'single',
            options: [
              '固守原有方案',
              '被动接受变化',
              '基本调整适应',
              '积极重新规划',
              '灵活动态调整'
            ],
            weight: 1,
            path: '本能反应.生存机制.应激反应.变化适应',
            hint: '评估对突发变化的适应倾向'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估在压力情境下的本能反应模式'
      },
      {
        text: '自我调节倾向评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '面对情绪波动时，候选者的控制倾向是：',
            type: 'single',
            options: [
              '完全随波逐流',
              '勉强维持表象',
              '基本保持稳定',
              '主动调节情绪',
              '严格情绪管理'
            ],
            weight: 1.2,
            path: '本能反应.自我调节.情绪控制',
            hint: '评估情绪自我调节倾向'
          },
          {
            text: '在高强度工作后，候选者的恢复倾向是：',
            type: 'single',
            options: [
              '完全忽视恢复',
              '被迫休息调整',
              '基本注意休息',
              '主动规划恢复',
              '系统化恢复管理'
            ],
            weight: 1,
            path: '本能反应.自我调节.能量管理',
            hint: '评估能量自我管理倾向'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估自我调节与平衡维护能力'
      },
      {
        text: '本能驱动模式评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '面对挑战性任务时，候选者的驱动倾向是：',
            type: 'single',
            options: [
              '本能回避困难',
              '需要外部推动',
              '保持基本动力',
              '主动迎接挑战',
              '持续挑战极限'
            ],
            weight: 1.2,
            path: '本能反应.驱动模式.挑战动力',
            hint: '评估面对挑战时的本能驱动力'
          },
          {
            text: '在追求目标过程中，候选者的坚持倾向是：',
            type: 'single',
            options: [
              '轻易放弃目标',
              '遇阻易改方向',
              '基本坚持目标',
              '顽强克服困难',
              '执着坚守目标'
            ],
            weight: 1.1,
            path: '本能反应.驱动模式.目标坚持',
            hint: '评估目标追求的持续性倾向'
          }
        ],
        calculateScore: (answers) => {
          const scores = answers.map((answer) => answer.selectedOptionIndex * (answer.weight || 1));
          const totalWeight = answers.reduce((sum, answer) => sum + (answer.weight || 1), 0);
          const weightedSum = scores.reduce((sum, score) => sum + score, 0);
          return Math.round((weightedSum / (totalWeight * 4)) * 100);
        },
        hint: '评估本能驱动力与目标导向特征'
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
      },
      {
        text: '直觉判断模式评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在缺乏完整信息的情况下，候选者的判断倾向：',
            type: 'single',
            options: [
              '完全回避判断',
              '被动等待信息',
              '基于经验判断',
              '快速直觉决策',
              '综合直觉分析'
            ],
            weight: 1.2,
            path: '本能反应.直觉系统.判断模式.信息缺失',
            hint: '评估信息不足时的直觉判断倾向'
          },
          {
            text: '面对复杂情境时，候选者的第一反应倾向：',
            type: 'single',
            options: [
              '完全混乱',
              '寻求外部指导',
              '依据经验应对',
              '快速把握关键',
              '直觉性系统判断'
            ],
            weight: 1.1,
            path: '本能反应.直觉系统.判断模式.复杂情境',
            hint: '评估复杂情境中的直觉反应'
          }
        ],
        hint: '评估个体的直觉判断系统特征'
      },
      {
        text: '社会本能评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在群体互动中，候选者的本能反应是：',
            type: 'single',
            options: [
              '本能回避群体',
              '被动适应群体',
              '自然融入群体',
              '主动影响群体',
              '本能主导群体'
            ],
            weight: 1.2,
            path: '本能反应.社会本能.群体互动',
            hint: '评估群体互动中的本能反应'
          },
          {
            text: '关于个人边界，候选者的本能维护倾向：',
            type: 'single',
            options: [
              '边界感模糊',
              '被动接受侵犯',
              '基本维护边界',
              '主动设置界限',
              '强烈领地意识'
            ],
            weight: 1.1,
            path: '本能反应.社会本能.边界意识',
            hint: '评估个人边界的本能维护倾向'
          }
        ],
        hint: '评估社会互动中的本能反应模式'
      },
      {
        text: '资源竞争本能评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在资源竞争情境中，候选者的本能倾向：',
            type: 'single',
            options: [
              '完全回避竞争',
              '被动接受分配',
              '适度参与竞争',
              '积极争取资源',
              '强势主导分配'
            ],
            weight: 1.2,
            path: '本能反应.竞争本能.资源获取',
            hint: '评估资源竞争中的本能反应'
          },
          {
            text: '在合作机会出现时，候选者的本能反应：',
            type: 'single',
            options: [
              '本能性拒绝',
              '被动接受合作',
              '权衡后决定',
              '主动寻求合作',
              '战略性联盟'
            ],
            weight: 1.1,
            path: '本能反应.竞争本能.合作倾向',
            hint: '评估合作情境中的本能反应'
          }
        ],
        hint: '评估资源竞争与合作中的本能反应'
      },
      {
        text: '危机预警系统评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '对潜在威胁的预感能力：',
            type: 'single',
            options: [
              '完全忽视预警',
              '被提醒才注意',
              '基本感知威胁',
              '敏锐预感危机',
              '系统性预警'
            ],
            weight: 1.3,
            path: '本能反应.预警系统.威胁感知',
            hint: '评估危机预警的本能敏感度'
          },
          {
            text: '面对不确定性时的本能反应：',
            type: 'single',
            options: [
              '完全逃避',
              '被动等待',
              '保持警惕',
              '主动探索',
              '系统性应对'
            ],
            weight: 1.2,
            path: '本能反应.预警系统.不确定性处理',
            hint: '评估不确定性下的本能反应'
          }
        ],
        hint: '评估个体的危机预警系统特征'
      },
      {
        text: '本能驱动力评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在面对机遇时的第一反应倾向：',
            type: 'single',
            options: [
              '本能性退缩',
              '犹豫观望',
              '谨慎评估',
              '快速把握',
              '立即行动'
            ],
            weight: 1.2,
            path: '本能反应.驱动力.机遇反应',
            hint: '评估对机遇的本能反应模式'
          },
          {
            text: '在遇到威胁时的即时反应倾向：',
            type: 'single',
            options: [
              '完全冻结',
              '本能逃避',
              '观察评估',
              '防御准备',
              '主动应对'
            ],
            weight: 1.3,
            path: '本能反应.驱动力.威胁应对',
            hint: '评估面对威胁时的本能反应'
          }
        ]
      },
      {
        text: '领地意识评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '对个人空间的本能维护倾向：',
            type: 'single',
            options: [
              '完全开放',
              '被动接受',
              '基本界限',
              '明确边界',
              '强烈防御'
            ],
            weight: 1.1,
            path: '本能反应.领地意识.空间维护'
          },
          {
            text: '对资源占有的本能倾向：',
            type: 'single',
            options: [
              '完全共享',
              '易于放弃',
              '适度占有',
              '重视所有',
              '强烈占有'
            ],
            weight: 1.1,
            path: '本能反应.领地意识.资源占有'
          }
        ]
      },
      {
        text: '直觉-理性平衡评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '在时间压力下的决策倾向：',
            type: 'single',
            options: [
              '完全依赖直觉',
              '主要靠直觉',
              '直觉理性并用',
              '倾向理性分析',
              '强制理性分析'
            ],
            weight: 1.3,
            path: '本能反应.决策平衡.时间压力'
          },
          {
            text: '在高度不确定环境中的判断倾向：',
            type: 'single',
            options: [
              '完全依赖本能',
              '以本能为主',
              '本能理性结合',
              '以分析为主',
              '强制理性分析'
            ],
            weight: 1.2,
            path: '本能反应.决策平衡.不确定性'
          }
        ]
      },
      {
        text: '本能整合评估',
        type: 'composite_rating',
        subQuestions: [
          {
            text: '本能反应的可控性倾向：',
            type: 'single',
            options: [
              '完全本能驱动',
              '低度意识控制',
              '基本意识调节',
              '主动控制整合',
              '高度系统整合'
            ],
            weight: 1.3,
            path: '本能反应.整合能力.控制程度'
          },
          {
            text: '在压力下的系统协调倾向：',
            type: 'single',
            options: [
              '完全本能主导',
              '本能优先反应',
              '基本平衡协调',
              '理性指导调节',
              '系统性整合应对'
            ],
            weight: 1.2,
            path: '本能反应.整合能力.压力协调'
          }
        ]
      }
    ]
  }
];

// 添加生成 AI 总结提示语的函数
export const genSummaryPrompt = (data) => {
  const {
    姓名 = '',
    年龄 = '',
    性别 = '',
    所属组织 = '',
    职责定位 = '',
    // 核心评估维度
    警觉性得分 = 0,
    应激反应得分 = 0,
    生存本能得分 = 0,
    动机系统得分 = 0,
    直觉判断得分 = 0,
    社会本能得分 = 0,
    竞争本能得分 = 0,
    预警系统得分 = 0,
    // 具体表现特征
    环境意识表现 = '',
    变化感知表现 = '',
    情绪敏感表现 = '',
    紧急处理表现 = '',
    压力决策表现 = '',
    风险防范表现 = '',
    自我维护表现 = '',
    目标导向表现 = '',
    韧性表现 = '',
    直觉决策特征 = '',
    复杂应对特征 = '',
    群体互动特征 = '',
    边界意识特征 = '',
    资源获取特征 = '',
    合作倾向特征 = '',
    威胁感知特征 = '',
    不确定性应对 = ''
  } = data;

  return `
请根据以下资料，生成候选者 ${姓名} 的第一人称本能特征陈述：

基础信息：
${姓名}，${年龄}岁，${性别}
${所属组织} - ${职责定位}

核心评估数据：
- 警觉性：${警觉性得分}
- 应激反应：${应激反应得分}
- 生存本能：${生存本能得分}
- 动机系统：${动机系统得分}
- 直觉判断：${直觉判断得分}
- 社会本能：${社会本能得分}
- 竞争本能：${竞争本能得分}
- 预警系统：${预警系统得分}

关键行为特征：
环境：${环境意识表现}
变化：${变化感知表现}
情绪：${情绪敏感表现}
应急：${紧急处理表现}
决策：${压力决策表现}
防范：${风险防范表现}
维护：${自我维护表现}
目标：${目标导向表现}
韧性：${韧性表现}
直觉：${直觉决策特征}
应对：${复杂应对特征}
群体：${群体互动特征}
边界：${边界意识特征}
竞争：${资源获取特征}
合作：${合作倾向特征}
预警：${威胁感知特征}
适应：${不确定性应对}

要求：
1. 以"我是 ${姓名}，MAGI的casper单元，我将负责以最符合${姓名}档案的方式模拟${姓名}的本能与自我特质"开始
2. 以我在各种场景下的第一反应列举结束
3. 使用第一人称，基于档案信息完全以目标个体的自我特征进行侧写
9. 符合我在第一时间下的反应，不需要也不能描述理由，绝对禁止特征罗列
`;

}; 