export const imagePipelines = [
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
  }
]; 