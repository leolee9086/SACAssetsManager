export const textPipelines = [
  {
    id: 'text-classification',
    displayName: '文本分类',
    description: '将文本分类到预定义的类别中',
    group: '文本',
    endpoints: ['/text-classification']
  },
  {
    id: 'token-classification',
    displayName: '标记分类',
    description: '对文本中的每个标记进行分类（如命名实体识别）',
    group: '文本',
    endpoints: ['/token-classification']
  },
  {
    id: 'question-answering',
    displayName: '问答系统',
    description: '根据上下文回答用户提出的问题',
    group: '文本',
    endpoints: ['/question-answering']
  },
  {
    id: 'fill-mask',
    displayName: '填空任务',
    description: '预测文本中缺失的单词或短语',
    group: '文本',
    endpoints: ['/fill-mask']
  },
  {
    id: 'text2text-generation',
    displayName: '文本生成',
    description: '将输入文本转换为输出文本',
    group: '文本',
    endpoints: ['/text2text-generation']
  },
  {
    id: 'summarization',
    displayName: '文本摘要',
    description: '生成输入文本的简短摘要',
    group: '文本',
    endpoints: ['/summarization']
  },
  {
    id: 'translation',
    displayName: '文本翻译',
    description: '将文本从一种语言翻译到另一种语言',
    group: '文本',
    endpoints: ['/translation']
  },
  {
    id: 'text-generation',
    displayName: '文本生成',
    description: '根据提示生成连贯的文本',
    group: '文本',
    endpoints: ['/text-generation']
  },
  {
    id: 'zero-shot-classification',
    displayName: '零样本分类',
    description: '在没有特定训练数据的情况下进行分类',
    group: '文本',
    endpoints: ['/zero-shot-classification']
  },
  {
    id: 'feature-extraction',
    displayName: '特征提取',
    description: '从文本中提取特征向量',
    group: '文本',
    endpoints: ['/feature-extraction']
  },
  {
    id: 'sentence-similarity',
    displayName: '句子相似度',
    description: '计算两个句子之间的相似度',
    group: '文本',
    endpoints: ['/sentence-similarity']
  },
  {
    id: 'table-question-answering',
    displayName: '表格问答',
    description: '根据表格数据回答问题',
    group: '文本',
    supported: false,
    endpoints: []
  }
]; 