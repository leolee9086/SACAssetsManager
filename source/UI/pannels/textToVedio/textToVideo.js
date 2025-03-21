import {VideoEncoderManager} from '../pannoViewer/videoEncoderManager.js';
import Konva from '../../../../static/konva.js';

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
    lineSpacing: 60,
    fadeInDuration: 0.5,
    fadeOutDuration: 0.5
  },
  thumbnail: {
    width: 192,
    height: 108
  },
  animations: {
    fadeIn: {type: 'opacity', from: 0, to: 1},
    fadeOut: {type: 'opacity', from: 1, to: 0},
    slideIn: {type: 'position', from: {x: -100, y: 0}, to: {x: 0, y: 0}},
    slideOut: {type: 'position', from: {x: 0, y: 0}, to: {x: 100, y: 0}},
    zoomIn: {type: 'scale', from: 0.5, to: 1},
    zoomOut: {type: 'scale', from: 1, to: 0.5}
  },
  positions: {
    center: {x: 0.5, y: 0.5},
    top: {x: 0.5, y: 0.1},
    bottom: {x: 0.5, y: 0.9},
    left: {x: 0.1, y: 0.5},
    right: {x: 0.9, y: 0.5},
    topLeft: {x: 0.1, y: 0.1},
    topRight: {x: 0.9, y: 0.1},
    bottomLeft: {x: 0.1, y: 0.9},
    bottomRight: {x: 0.9, y: 0.9},
    middle: {x: 0.5, y: 0.5},
    中间: {x: 0.5, y: 0.5},
    顶部: {x: 0.5, y: 0.1},
    底部: {x: 0.5, y: 0.9},
    左侧: {x: 0.1, y: 0.5},
    右侧: {x: 0.9, y: 0.5},
    左上: {x: 0.1, y: 0.1},
    右上: {x: 0.9, y: 0.1},
    左下: {x: 0.1, y: 0.9},
    右下: {x: 0.9, y: 0.9},
    上方: {x: 0.5, y: 0.3},
    下方: {x: 0.5, y: 0.7},
    中上: {x: 0.5, y: 0.3},
    中下: {x: 0.5, y: 0.7},
    顶部中央: {x: 0.5, y: 0.05},
    底部中央: {x: 0.5, y: 0.95},
    左侧中央: {x: 0.05, y: 0.5},
    右侧中央: {x: 0.95, y: 0.5}
  },
  origins: {
    center: {x: 0.5, y: 0.5},
    topLeft: {x: 0, y: 0},
    topRight: {x: 1, y: 0},
    bottomLeft: {x: 0, y: 1},
    bottomRight: {x: 1, y: 1},
    左上角: {x: 0, y: 0},
    右上角: {x: 1, y: 0},
    左下角: {x: 0, y: 1},
    右下角: {x: 1, y: 1},
    中心: {x: 0.5, y: 0.5}
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

// 增强版：解析文本行中的IAL属性
const parseLineWithAttributes = (line) => {
  const match = line.match(/(.*?)(?:\s*\{:\s*(.*?)\s*\}\s*)?$/);
  if (!match) return { text: line, attributes: {} };
  
  const text = match[1];
  const attributesString = match[2] || '';
  
  const attributes = {};
  if (attributesString) {
    const attrMatches = attributesString.matchAll(/(\w+)="([^"]*)"|(\w+)=(\S+)|(\w+)/g);
    for (const attrMatch of attrMatches) {
      const [, key1, value1, key2, value2, key3] = attrMatch;
      const key = key1 || key2 || key3;
      const value = value1 || value2 || true;
      attributes[key] = value;
    }
  }
  
  return { text, attributes };
};

// 转换IAL属性为Konva属性
const attributesToKonvaProps = (attributes, config) => {
  // 获取渲染配置，确保我们使用的是完整的配置
  const renderConfig = CONFIG.rendering;
  
  const props = {
    fill: attributes.color || renderConfig.textColor,
    fontFamily: attributes.fontFamily || (renderConfig.font ? renderConfig.font.split('px ')[1] : 'KaiTi'),
    fontSize: parseInt(attributes.fontSize) || (renderConfig.font ? parseInt(renderConfig.font) : 48),
    fontStyle: '',
    align: attributes.align || 'center',
    verticalAlign: attributes.verticalAlign || 'middle',
    padding: parseInt(attributes.padding) || 0,
    opacity: parseFloat(attributes.opacity) || 1,
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    shadowColor: attributes.shadowColor || undefined,
    shadowBlur: attributes.shadowBlur ? parseInt(attributes.shadowBlur) : undefined,
    shadowOffset: attributes.shadowOffset ? JSON.parse(attributes.shadowOffset) : undefined,
    shadowOpacity: attributes.shadowOpacity ? parseFloat(attributes.shadowOpacity) : undefined,
    strokeWidth: attributes.strokeWidth ? parseInt(attributes.strokeWidth) : 0,
    stroke: attributes.stroke || undefined,
  };
  
  if (attributes.bold) props.fontStyle += 'bold ';
  if (attributes.italic) props.fontStyle += 'italic ';
  props.fontStyle = props.fontStyle.trim() || 'normal';
  
  // 增强位置处理
  // 1. 处理预定义位置
  if (attributes.position && (CONFIG.positions[attributes.position] || attributes.position === 'custom')) {
    if (attributes.position === 'custom') {
      // 自定义位置 - 从x和y属性获取
      props.x = attributes.x ? parseFloat(attributes.x) * config.width : config.width / 2;
      props.y = attributes.y ? parseFloat(attributes.y) * config.height : config.height / 2;
    } else {
      // 预定义位置
      const pos = CONFIG.positions[attributes.position];
      props.x = pos.x * config.width;
      props.y = pos.y * config.height;
    }
  } else {
    // 默认使用中心位置
    const defaultPos = CONFIG.positions.center;
    props.x = defaultPos.x * config.width;
    props.y = defaultPos.y * config.height;
  }
  
  // 2. 处理原点(origin)定义
  if (attributes.origin) {
    let originPos;
    
    // 可以是预定义原点名称或直接是坐标
    if (CONFIG.origins[attributes.origin]) {
      originPos = CONFIG.origins[attributes.origin];
    } else if (attributes.origin.includes(',')) {
      // 解析形如 "0.1,0.2" 的坐标
      const [originX, originY] = attributes.origin.split(',').map(parseFloat);
      originPos = {x: originX, y: originY};
    } else {
      // 默认使用中心原点
      originPos = CONFIG.origins.center;
    }
    
    // 应用原点
    props.x = originPos.x * config.width;
    props.y = originPos.y * config.height;
  }
  
  // 3. 处理偏移量(offset)
  if (attributes.offsetX) {
    const offsetX = parseFloat(attributes.offsetX);
    // 可以是百分比(带%)或像素值
    if (attributes.offsetX.includes('%')) {
      props.x += (offsetX / 100) * config.width;
    } else {
      props.x += offsetX;
    }
  }
  
  if (attributes.offsetY) {
    const offsetY = parseFloat(attributes.offsetY);
    // 可以是百分比(带%)或像素值
    if (attributes.offsetY.includes('%')) {
      props.y += (offsetY / 100) * config.height;
    } else {
      props.y += offsetY;
    }
  }
  
  if (attributes.bgColor) {
    props.fillAfterStrokeEnabled = true;
    props.fillPriority = 'color';
  }
  
  return props;
};

// 计算动画进度
const calculateAnimationProgress = (frameIndex, startFrame, endFrame, attributes) => {
  const totalFrames = endFrame - startFrame + 1;
  const elapsedFrames = frameIndex - startFrame;
  const progress = elapsedFrames / totalFrames;
  
  const fadeInDuration = attributes.fadeInDuration ? 
      parseFloat(attributes.fadeInDuration) : CONFIG.rendering.fadeInDuration;
  const fadeOutDuration = attributes.fadeOutDuration ? 
      parseFloat(attributes.fadeOutDuration) : CONFIG.rendering.fadeOutDuration;
  
  const fadeInFrames = fadeInDuration * CONFIG.video.fps;
  const fadeOutFrames = fadeOutDuration * CONFIG.video.fps;
  
  let fadeInProgress = 1;
  if (elapsedFrames < fadeInFrames) {
    fadeInProgress = elapsedFrames / fadeInFrames;
  }
  
  let fadeOutProgress = 1;
  if (totalFrames - elapsedFrames < fadeOutFrames) {
    fadeOutProgress = (totalFrames - elapsedFrames) / fadeOutFrames;
  }
  
  const animationEffects = {};
  if (attributes.animation && CONFIG.animations[attributes.animation]) {
    const animation = CONFIG.animations[attributes.animation];
    const animationProgress = Math.min(1, Math.max(0, progress));
    
    switch (animation.type) {
      case 'opacity':
        animationEffects.opacity = animation.from + (animation.to - animation.from) * animationProgress;
        break;
      case 'position':
        animationEffects.x = animation.from.x + (animation.to.x - animation.from.x) * animationProgress;
        animationEffects.y = animation.from.y + (animation.to.y - animation.from.y) * animationProgress;
        break;
      case 'scale':
        animationEffects.scaleX = animation.from + (animation.to - animation.from) * animationProgress;
        animationEffects.scaleY = animation.from + (animation.to - animation.from) * animationProgress;
        break;
    }
  }
  
  return {
    fadeInProgress,
    fadeOutProgress,
    animationEffects,
    progress
  };
};

// 使用Konva渲染文本到画布
const renderTextToCanvas = (canvas, textData, frameProgress, config) => {
  const { text, attributes } = textData;
  const { startFrame, endFrame, currentFrame } = frameProgress;
  
  // 创建临时容器元素
  const tempContainer = document.createElement('div');
  tempContainer.style.display = 'none';
  document.body.appendChild(tempContainer);
  
  // 使用临时容器初始化Konva舞台
  const stage = new Konva.Stage({
    container: tempContainer,
    width: config.width,
    height: config.height,
  });
  
  // 确保传递一个完整的配置对象给attributesToKonvaProps
  // 包含宽度和高度以及渲染配置信息
  const fullConfig = {
    ...config,
    ...CONFIG.rendering
  };
  
  const layer = new Konva.Layer();
  stage.add(layer);
  
  const bgColor = attributes.bgColor || CONFIG.rendering.backgroundColor;
  const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: config.width,
    height: config.height,
    fill: bgColor,
  });
  layer.add(background);
  
  const animation = calculateAnimationProgress(
    currentFrame, 
    startFrame, 
    endFrame, 
    attributes
  );
  
  const konvaProps = attributesToKonvaProps(attributes, fullConfig);
  
  konvaProps.opacity *= animation.fadeInProgress * animation.fadeOutProgress;
  if (animation.animationEffects.opacity) {
    konvaProps.opacity *= animation.animationEffects.opacity;
  }
  if (animation.animationEffects.x) {
    konvaProps.x += animation.animationEffects.x;
  }
  if (animation.animationEffects.y) {
    konvaProps.y += animation.animationEffects.y;
  }
  if (animation.animationEffects.scaleX) {
    konvaProps.scaleX = animation.animationEffects.scaleX;
    konvaProps.scaleY = animation.animationEffects.scaleY;
  }
  
  const lines = text.split('，');
  const lineSpacing = parseInt(attributes.lineSpacing) || CONFIG.rendering.lineSpacing;
  const totalHeight = (lines.length - 1) * lineSpacing;
  
  lines.forEach((line, i) => {
    const textNode = new Konva.Text({
      ...konvaProps,
      text: line,
      y: konvaProps.y - totalHeight / 2 + i * lineSpacing,
    });
    
    textNode.offsetX(textNode.width() / 2);
    
    if (attributes.bgColor) {
      const padding = parseInt(attributes.padding) || 10;
      const textBg = new Konva.Rect({
        x: textNode.x() - textNode.offsetX() - padding,
        y: textNode.y() - textNode.offsetY() - padding,
        width: textNode.width() + padding * 2,
        height: textNode.height() + padding * 2,
        fill: attributes.bgColor,
        opacity: parseFloat(attributes.bgOpacity) || 0.5,
        cornerRadius: parseInt(attributes.cornerRadius) || 0,
      });
      layer.add(textBg);
    }
    
    layer.add(textNode);
  });
  
  layer.draw();
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const dataURL = stage.toDataURL();
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataURL;
  
  // 确保在返回Promise之前清理临时DOM元素
  return new Promise(resolve => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      // 清理临时DOM元素
      document.body.removeChild(tempContainer);
      resolve(canvas);
    };
    img.onerror = () => {
      console.error('无法加载Konva生成的图像');
      document.body.removeChild(tempContainer);
      // 如果图像加载失败，使用普通方式绘制
      ctx.fillStyle = CONFIG.rendering.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = CONFIG.rendering.textColor;
      ctx.font = CONFIG.rendering.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width/2, canvas.height/2);
      resolve(canvas);
    };
  });
};

// 辅助函数：创建帧生成器
const createFrameGenerator = (textContents, config) => {
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
  
  const totalFrames = currentStartFrame;
  
  return async (frameIndex) => {
    const currentSegment = textSegments.find(
      segment => frameIndex >= segment.startFrame && frameIndex <= segment.endFrame
    ) || { text: '' };
    
    if (!currentSegment.text) {
      const canvas = createCanvas(config.width, config.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = CONFIG.rendering.backgroundColor;
      ctx.fillRect(0, 0, config.width, config.height);
      const thumbnailDataURL = await createThumbnail(canvas);
      return { imageData: canvas, thumbnailDataURL };
    }
    
    const textData = parseLineWithAttributes(currentSegment.text);
    
    const frameProgress = {
      startFrame: currentSegment.startFrame,
      endFrame: currentSegment.endFrame,
      currentFrame: frameIndex
    };
    
    const canvas = createCanvas(config.width, config.height);
    await renderTextToCanvas(canvas, textData, frameProgress, config);
    
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
  const config = {...CONFIG.video};
  const { onProgress = null } = options;
  
  const processedTextContents = textToProcess;
  
  const encoder = new VideoEncoderManager(config);
  
  const frameGenerator = createFrameGenerator(processedTextContents, config);
  
  const firstFrame = await frameGenerator(0);
  const totalFrames = firstFrame.totalFrames;
  
  validateInput(processedTextContents, totalFrames);

  await encoder.processFrames(
    totalFrames, 
    frameGenerator,
    (current, total) => {
      if (typeof onProgress === 'function') {
        onProgress(current, total);
      }
    }
  );

  return encoder.finalize();
}
