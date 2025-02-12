export const audioPipelines = [
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
  }
]; 