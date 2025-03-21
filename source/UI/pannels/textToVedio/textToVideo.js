import {VideoEncoderManager} from '../pannoViewer/videoEncoderManager.js';

// 配置常量
const CONFIG = {
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    format: 'mp4',
    quality: 0.9
  },
  rendering: {
    durationPerText: 2,
    backgroundColor: '#F5F5DC',
    textColor: '#000000',
    font: '48px KaiTi',
    lineSpacing: 60
  },
  thumbnail: {
    width: 192,
    height: 108
  }
};

// 辅助函数：将Blob转换为DataURL
const blobToDataURL = blob => 
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

// 辅助函数：创建画布
const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

// 辅助函数：创建缩略图
const createThumbnail = async (sourceCanvas, { width, height } = CONFIG.thumbnail) => {
  const thumbnailCanvas = createCanvas(width, height);
  const thumbnailCtx = thumbnailCanvas.getContext('2d');
  thumbnailCtx.drawImage(sourceCanvas, 0, 0, width, height);
  const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve));
  return blobToDataURL(thumbnailBlob);
};

// 辅助函数：解析文本行中的IAL属性
const parseLineWithAttributes = (line) => {
  const match = line.match(/(.*?)(?:\s*\{:\s*(.*?)\s*\}\s*)?$/);
  if (!match) return { text: line, attributes: {} };
  
  const text = match[1];
  const attributesString = match[2] || '';
  
  const attributes = {};
  if (attributesString) {
    const attrMatches = attributesString.matchAll(/(\w+)="([^"]*)"|(\w+)=(\S+)/g);
    for (const attrMatch of attrMatches) {
      const [, key1, value1, key2, value2] = attrMatch;
      attributes[key1 || key2] = value1 || value2;
    }
  }
  
  return { text, attributes };
};

// 辅助函数：渲染文本到画布
const renderTextToCanvas = (canvas, textData, fadeInProgress = 1) => {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const { backgroundColor, textColor, font, lineSpacing } = CONFIG.rendering;
  
  // 设置背景
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // 设置文字样式
  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 添加文字渐入效果
  ctx.globalAlpha = Math.min(1, fadeInProgress);

  // 绘制文字
  const lines = textData.text.split('，');
  const lineOffset = (lines.length - 1) * (lineSpacing / 2);
  
  lines.forEach((line, i) => {
    ctx.fillText(
      line, 
      width / 2,
      height / 2 - lineOffset + i * lineSpacing
    );
  });
  
  return canvas;
};

// 辅助函数：创建帧生成器
const createFrameGenerator = (textContents, config) => {
  // 计算每个文本段的帧数和起始帧
  const textSegments = [];
  let currentStartFrame = 0;
  
  textContents.forEach(text => {
    const { attributes } = parseLineWithAttributes(text);
    const duration = parseFloat(attributes.duration) || CONFIG.rendering.durationPerText;
    const framesCount = Math.floor(config.fps * duration);
    
    textSegments.push({
      text,
      startFrame: currentStartFrame,
      endFrame: currentStartFrame + framesCount - 1,
      duration
    });
    
    currentStartFrame += framesCount;
  });
  
  // 总帧数
  const totalFrames = currentStartFrame;
  
  // 返回帧生成器函数
  return async (frameIndex) => {
    // 找到当前帧对应的文本段
    const currentSegment = textSegments.find(
      segment => frameIndex >= segment.startFrame && frameIndex <= segment.endFrame
    ) || { text: '' };
    
    if (!currentSegment.text) {
      // 如果找不到对应文本，返回空白帧
      const canvas = createCanvas(config.width, config.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = CONFIG.rendering.backgroundColor;
      ctx.fillRect(0, 0, config.width, config.height);
      const thumbnailDataURL = await createThumbnail(canvas);
      return { imageData: canvas, thumbnailDataURL };
    }
    
    // 解析文本和属性
    const textData = parseLineWithAttributes(currentSegment.text);
    
    // 计算淡入效果进度
    const elapsedFrames = frameIndex - currentSegment.startFrame;
    const fadeInProgress = elapsedFrames / config.fps;
    
    // 渲染主画布
    const canvas = createCanvas(config.width, config.height);
    renderTextToCanvas(canvas, textData, fadeInProgress);
    
    // 创建缩略图
    const thumbnailDataURL = await createThumbnail(canvas);

    return { imageData: canvas, thumbnailDataURL, totalFrames };
  };
};

// 参数验证函数
const validateInput = (textContents, totalFrames) => {
  if (!Array.isArray(textContents) || textContents.length === 0) {
    throw new Error('文本内容必须是非空数组');
  }
  
  if (totalFrames > 3600) {
    console.warn(`警告: 视频帧数(${totalFrames})较多，可能会影响性能`);
  }
};

// 主函数：创建文本视频
export async function createTextVideo(textToProcess, options = {}) {
  // 合并配置和选项
  const config = {...CONFIG.video};
  const { onProgress = null } = options;
  
  // 处理文本内容
  const processedTextContents = textToProcess;
  
  // 初始化编码器
  const encoder = new VideoEncoderManager(config);
  
  // 创建帧生成器
  const frameGenerator = createFrameGenerator(processedTextContents, config);
  
  // 计算总帧数 - 让第一帧告诉我们总共有多少帧
  const firstFrame = await frameGenerator(0);
  const totalFrames = firstFrame.totalFrames;
  
  // 参数验证
  validateInput(processedTextContents, totalFrames);

  // 开始渲染
  await encoder.processFrames(
    totalFrames, 
    frameGenerator,
    (current, total) => {
      if (typeof onProgress === 'function') {
        onProgress(current, total);
      }
    }
  );

  // 完成编码并获取视频文件
  return encoder.finalize();
}
