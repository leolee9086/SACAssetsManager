import {VideoEncoderManager} from '../pannoViewer/videoEncoderManager.js';

// 默认配置常量
const DEFAULT_VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  format: 'mp4',
  quality: 0.9
};

const DEFAULT_OPTIONS = {
  durationPerText: 2,
  onProgress: null
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
const createThumbnail = async (sourceCanvas, width = 192, height = 108) => {
  const thumbnailCanvas = createCanvas(width, height);
  const thumbnailCtx = thumbnailCanvas.getContext('2d');
  thumbnailCtx.drawImage(sourceCanvas, 0, 0, width, height);
  const thumbnailBlob = await new Promise(resolve => thumbnailCanvas.toBlob(resolve));
  return blobToDataURL(thumbnailBlob);
};

// 辅助函数：渲染文本到画布
const renderTextToCanvas = (canvas, text, fadeInProgress = 1) => {
  const ctx = canvas.getContext('2d');
  const {width, height} = canvas;
  
  // 设置背景
  ctx.fillStyle = '#F5F5DC';  // 米色背景
  ctx.fillRect(0, 0, width, height);

  // 设置文字样式
  ctx.fillStyle = '#000000';
  ctx.font = '48px KaiTi';  // 楷体
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 添加文字渐入效果
  ctx.globalAlpha = Math.min(1, fadeInProgress);

  // 绘制文字
  const lines = text.split('，');
  lines.forEach((line, i) => {
    ctx.fillText(
      line, 
      width / 2,
      height / 2 - (lines.length - 1) * 30 + i * 60
    );
  });
  
  return canvas;
};

// 辅助函数：创建帧生成器
const createFrameGenerator = (textContents, config) => async (frameIndex) => {
  // 计算当前应显示的文本
  const framesPerText = config.fps * DEFAULT_OPTIONS.durationPerText;
  const currentTextIndex = Math.floor(frameIndex / framesPerText);
  const currentText = currentTextIndex < textContents.length ? textContents[currentTextIndex] : '';
  
  // 计算淡入效果进度
  const fadeInProgress = (frameIndex % framesPerText) / config.fps;
  
  // 渲染主画布
  const canvas = createCanvas(config.width, config.height);
  renderTextToCanvas(canvas, currentText, fadeInProgress);
  
  // 创建缩略图
  const thumbnailDataURL = await createThumbnail(canvas);

  return { imageData: canvas, thumbnailDataURL };
};

// 主函数：创建文本视频
export async function createTextVideo(textToProcess, options = {}) {
  // 合并配置和选项
  const config = {...DEFAULT_VIDEO_CONFIG};
  const { durationPerText = DEFAULT_OPTIONS.durationPerText, onProgress = DEFAULT_OPTIONS.onProgress } = options;
  
  // 处理文本内容
  const processedTextContents = textToProcess;
  
  // 参数验证
  if (!Array.isArray(processedTextContents) || processedTextContents.length === 0) {
    throw new Error('文本内容必须是非空数组');
  }
  
  // 计算总帧数
  const totalFrames = processedTextContents.length * config.fps * durationPerText;
  
  // 性能检查
  if (totalFrames > 3600) {
    console.warn(`警告: 视频帧数(${totalFrames})较多，可能会影响性能`);
  }

  // 初始化编码器
  const encoder = new VideoEncoderManager(config);
  
  // 创建帧生成器
  const frameGenerator = createFrameGenerator(processedTextContents, config);

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
