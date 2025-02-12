export const pipelines = [
  // 文本相关任务
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
  },
  
  // 音频相关任务
  {
    id: 'audio-classification',
    displayName: '音频分类',
    description: '将音频分类到预定义的类别中',
    group: '音频',
    endpoints: ['/audio-classification']
  },
  {
    id: 'zero-shot-audio-classification',
    displayName: '零样本音频分类',
    description: '在没有特定训练数据的情况下对音频进行分类',
    group: '音频',
    endpoints: ['/zero-shot-audio-classification']
  },
  {
    id: 'automatic-speech-recognition',
    displayName: '语音识别',
    description: '将语音转换为文本',
    group: '音频',
    endpoints: ['/automatic-speech-recognition']
  },
  {
    id: 'text-to-audio',
    displayName: '文本转语音',
    description: '将文本转换为语音',
    group: '音频',
    endpoints: ['/text-to-audio']
  },
  {
    id: 'audio-to-audio',
    displayName: '音频转音频',
    description: '将一种音频格式转换为另一种',
    group: '音频',
    supported: false,
    endpoints: []
  },
  
  // 图像相关任务
  {
    id: 'image-classification',
    displayName: '图像分类',
    description: '将图像分类到预定义的类别中',
    group: '图像',
    endpoints: ['/image-classification']
  },
  {
    id: 'image-segmentation',
    displayName: '图像分割',
    description: '将图像分割为多个区域',
    group: '图像',
    endpoints: ['/image-segmentation']
  },
  {
    id: 'zero-shot-image-classification',
    displayName: '零样本图像分类',
    description: '在没有特定训练数据的情况下对图像进行分类',
    group: '图像',
    endpoints: ['/zero-shot-image-classification']
  },
  {
    id: 'object-detection',
    displayName: '目标检测',
    description: '检测图像中的对象并定位其位置',
    group: '图像',
    endpoints: ['/object-detection']
  },
  {
    id: 'zero-shot-object-detection',
    displayName: '零样本目标检测',
    description: '在没有特定训练数据的情况下检测图像中的对象',
    group: '图像',
    endpoints: ['/zero-shot-object-detection']
  },
  {
    id: 'document-question-answering',
    displayName: '文档问答',
    description: '根据文档内容回答问题',
    group: '图像',
    endpoints: ['/document-question-answering']
  },
  {
    id: 'image-to-text',
    displayName: '图像转文本',
    description: '生成描述图像内容的文本',
    group: '图像',
    endpoints: ['/image-to-text']
  },
  {
    id: 'image-to-image',
    displayName: '图像转图像',
    description: '将一种图像转换为另一种图像',
    group: '图像',
    endpoints: ['/image-to-image']
  },
  {
    id: 'depth-estimation',
    displayName: '深度估计',
    description: '估计图像中物体的深度信息',
    group: '图像',
    endpoints: ['/depth-estimation']
  },
  {
    id: 'image-feature-extraction',
    displayName: '图像特征提取',
    description: '从图像中提取特征向量',
    group: '图像',
    endpoints: ['/image-feature-extraction']
  },
  {
    id: 'mask-generation',
    displayName: '掩码生成',
    description: '生成图像的掩码',
    group: '图像',
    supported: false,
    endpoints: []
  },
  {
    id: 'video-classification',
    displayName: '视频分类',
    description: '将视频分类到预定义的类别中',
    group: '图像',
    supported: false,
    endpoints: []
  },
  {
    id: 'unconditional-image-generation',
    displayName: '无条件图像生成',
    description: '生成随机图像',
    group: '图像',
    supported: false,
    endpoints: []
  },
  
  // 多模态任务
  {
    id: 'text-to-image',
    displayName: '文本转图像',
    description: '根据文本描述生成图像',
    group: '多模态',
    supported: false,
    endpoints: []
  },
  {
    id: 'visual-question-answering',
    displayName: '视觉问答',
    description: '根据图像内容回答问题',
    group: '多模态',
    supported: false,
    endpoints: []
  },
  
  // 表格相关任务
  {
    id: 'tabular-classification',
    displayName: '表格分类',
    description: '将表格数据分类到预定义的类别中',
    group: '表格',
    supported: false,
    endpoints: []
  },
  {
    id: 'tabular-regression',
    displayName: '表格回归',
    description: '对表格数据进行回归分析',
    group: '表格',
    supported: false,
    endpoints: []
  },
  
  // 强化学习
  {
    id: 'reinforcement-learning',
    displayName: '强化学习',
    description: '通过与环境交互来学习策略',
    group: '强化学习',
    endpoints: ['/reinforcement-learning']
  }
]; 