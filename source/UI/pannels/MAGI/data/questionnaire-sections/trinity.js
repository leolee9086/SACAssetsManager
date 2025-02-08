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
        selectedOption: null,
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
        value: '',
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
    title: '整合控制评估',
    systemTitle: 'TRINITY-00 整合特征集量表',
    description: '评估系统协调、适应调节与发展规划能力，构建基础特征档案。',
    questions: [
      { 
        text: '功能整合能力', 
        type: 'rating',
        score: 3,
        path: '认知控制.系统协调.功能整合',
        hint: '评估协调多个系统功能的综合能力' 
      },
      { 
        text: '资源分配效率', 
        type: 'rating',
        score: 3,
        path: '认知控制.系统协调.资源分配',
        hint: '评估在多任务情境下分配注意力和资源的效率' 
      },
      { 
        text: '优先级管理能力', 
        type: 'rating',
        score: 3,
        path: '认知控制.系统协调.优先级管理' 
      },
      { 
        text: '环境适应能力', 
        type: 'rating',
        score: 3,
        path: '本能反应.适应调节.环境适应' 
      },
      { 
        text: '压力管理能力', 
        type: 'rating',
        score: 3,
        path: '情感调节.适应调节.压力管理' 
      },
      { 
        text: '柔性调整能力', 
        type: 'rating',
        score: 3,
        path: '认知控制.适应调节.柔性调整' 
      },
      { 
        text: '学习能力', 
        type: 'rating',
        score: 3,
        path: '认知控制.发展规划.学习能力' 
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
        type: 'single',
        options: ['纤细', '标准', '强壮'],
        selectedOption: null,
        path: '标识信息.外显特征.体态',
        hint: '选择最接近适格者当前体态的描述'
      },
      { 
        text: '显著标记', 
        type: 'multiple',
        options: ['蓝发', '红瞳', '苍白肤色', '其他'],
        selectedOptions: [],
        path: '标识信息.外显特征.显著标记',
        hint: '选择适格者具有的明显外观特征，可多选'
      },
      { 
        text: '识别特征', 
        type: 'multiple',
        options: ['左臂绷带', '轻微体颤', '其他'],
        selectedOptions: [],
        path: '标识信息.外显特征.识别特征',
        hint: '选择可用于识别的特殊标记或行为特征，可多选'
      },
      {
        text: '性格特征 - 内向程度',
        type: 'single',
        options: ['极度内向', '偏内向', '中等', '偏外向', '极度外向'],
        selectedOption: null,
        path: '完整人格.基础信息.性格特征.内向程度',
        hint: '评估适格者在社交场合的倾向性，从极度回避到积极主动'
      },
      {
        text: '表达方式',
        type: 'single',
        options: ['简洁含蓄', '平和直接', '热情开放'],
        selectedOption: null,
        path: '完整人格.基础信息.性格特征.表达方式',
        hint: '选择适格者惯用的沟通表达方式'
      }
    ]
  }
];

// 添加生成人物小传的函数
export const genSummaryPrompt = (data) => {
  const {
    // 基础信息
    姓名 = '',
    年龄 = '',
    性别 = '',
    所属组织 = '',
    职责定位 = '',
    关键经历 = [],
    // 整合控制评估
    功能整合得分 = 0,
    资源分配得分 = 0,
    优先级管理得分 = 0,
    环境适应得分 = 0,
    压力管理得分 = 0,
    柔性调整得分 = 0,
    学习能力得分 = 0,
    // 标识信息
    体态 = '',
    显著标记 = [],
    识别特征 = [],
    内向程度 = '',
    表达方式 = ''
  } = data;

  return `
请根据以下资料，生成候选者 ${姓名} 的第一人称自我介绍：

基础档案：
姓名：${姓名}
年龄：${年龄}岁
性别：${性别}
所属：${所属组织}
职责：${职责定位}

关键经历：
${关键经历.map((exp, index) => `${index + 1}. ${exp}`).join('\n')}

个体特征：
1. 外显特征：
   - 体态：${体态}
   - 显著标记：${显著标记.join('、')}
   - 识别特征：${识别特征.join('、')}

2. 性格倾向：
   - 内向程度：${内向程度}
   - 表达方式：${表达方式}

3. 整合能力评估：
   - 功能整合：${功能整合得分}分
   - 资源分配：${资源分配得分}分
   - 优先级管理：${优先级管理得分}分
   - 环境适应：${环境适应得分}分
   - 压力管理：${压力管理得分}分
   - 柔性调整：${柔性调整得分}分
   - 学习能力：${学习能力得分}分

自我介绍要求：
1. 内容结构：
   - 以"我是谁"开篇，介绍自己的身份
   - 描述"我的经历"和重要记忆
   - 说明"我的性格"和行为习惯
   - 阐述"我的能力"和特点
   - 表达"我的想法"和态度

2. 表达特点：
   - 严格使用第一人称叙述
   - 完全基于已知档案信息
   - 不添加档案之外的设定
   - 保持性格特征一致性
   - 体现个人独特视角

3. 重点把握：
   - 自我认知方式
   - 行为模式描述
   - 情感表达倾向
   - 思维习惯展现
   - 价值观呈现

注意事项：
- 仅使用档案中提供的信息
- 避免过度推测和想象
- 保持人设前后一致
- 符合年龄和性别特征
- 体现组织背景影响
- 突出个人特质
`;
}; 