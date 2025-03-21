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
    slideIn: {type: 'positionOffset', fromX: -0.3, fromY: 0, toX: 0, toY: 0},
    slideOut: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0.3, toY: 0},
    zoomIn: {type: 'scale', from: 0.5, to: 1},
    zoomOut: {type: 'scale', from: 1, to: 0.5},
    slideFromTop: {type: 'positionOffset', fromX: 0, fromY: -0.3, toX: 0, toY: 0},
    slideToTop: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0, toY: -0.3},
    slideFromBottom: {type: 'positionOffset', fromX: 0, fromY: 0.3, toX: 0, toY: 0},
    slideToBottom: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0, toY: 0.3},
    slideFromLeft: {type: 'positionOffset', fromX: -0.3, fromY: 0, toX: 0, toY: 0},
    slideToLeft: {type: 'positionOffset', fromX: 0, fromY: 0, toX: -0.3, toY: 0},
    slideFromRight: {type: 'positionOffset', fromX: 0.3, fromY: 0, toX: 0, toY: 0},
    slideToRight: {type: 'positionOffset', fromX: 0, fromY: 0, toX: 0.3, toY: 0},
    bounce: {type: 'positionOffset', fromX: 0, fromY: -0.05, toX: 0, toY: 0, easing: 'elastic'},
    rotateIn: {type: 'rotation', from: -180, to: 0},
    rotateOut: {type: 'rotation', from: 0, to: 180},
    spin: {type: 'rotation', from: 0, to: 360, cycle: true},
    spinReverse: {type: 'rotation', from: 0, to: -360, cycle: true},
    blink: {type: 'opacity', from: 1, to: 0, cycle: true, cycleDuration: 0.5},
    flash: {type: 'opacity', values: [1, 0, 1, 0, 1], keyTimes: [0, 0.25, 0.5, 0.75, 1]},
    shake: {type: 'positionOffsetPattern', 
           xPattern: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0], 
           yPattern: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
           relative: true},
    wave: {type: 'positionOffsetPattern',
           xPattern: [0, 0, 0, 0, 0],
           yPattern: [0, -10, 0, 10, 0],
           cycle: true,
           relative: true},
    flipX: {type: 'scale', scaleXFrom: 1, scaleXTo: -1, scaleYFrom: 1, scaleYTo: 1},
    flipY: {type: 'scale', scaleXFrom: 1, scaleXTo: 1, scaleYFrom: 1, scaleYTo: -1},
    popIn: {
      compositions: [
        {type: 'scale', from: 0.5, to: 1.1, duration: 0.7},
        {type: 'scale', from: 1.1, to: 1, startAt: 0.7},
        {type: 'opacity', from: 0, to: 1, duration: 0.5}
      ]
    },
    bounceIn: {
      compositions: [
        {type: 'scale', from: 0.3, to: 1, easing: 'bounce'},
        {type: 'opacity', from: 0, to: 1, duration: 0.3}
      ]
    },
    typewriter: {type: 'special', effect: 'typewriter', speed: 0.1},
    fadeColor: {type: 'color', from: '#ff0000', to: '#0000ff'},
    blurIn: {type: 'blur', from: 10, to: 0},
    blurOut: {type: 'blur', from: 0, to: 10}
  },
  easings: {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    elastic: t => {
      const p = 0.3;
      return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },
    bounce: t => {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        t -= 1.5 / 2.75;
        return 7.5625 * t * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        t -= 2.25 / 2.75;
        return 7.5625 * t * t + 0.9375;
      } else {
        t -= 2.625 / 2.75;
        return 7.5625 * t * t + 0.984375;
      }
    }
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

// 计算动画进度 - 增强版
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
  
  // 动画效果处理
  const animationEffects = {};
  
  // 处理复合动画
  if (attributes.animation && CONFIG.animations[attributes.animation]) {
    const animation = CONFIG.animations[attributes.animation];
    
    // 处理组合动画
    if (animation.compositions) {
      for (const comp of animation.compositions) {
        // 计算该动画组件的有效时间范围
        const startAt = comp.startAt || 0;
        const duration = comp.duration || (1 - startAt);
        const endAt = startAt + duration;
        
        // 如果当前进度在该动画范围内
        if (progress >= startAt && progress <= endAt) {
          // 计算在该动画内的相对进度
          const compProgress = (progress - startAt) / duration;
          
          // 使用缓动函数
          const easingName = comp.easing || 'linear';
          const easingFn = CONFIG.easings[easingName] || CONFIG.easings.linear;
          const easedProgress = easingFn(compProgress);
          
          // 根据类型应用动画效果
          applyAnimationByType(comp, easedProgress, animationEffects);
        }
      }
    } 
    // 处理单一动画
    else {
      const easingName = animation.easing || attributes.easing || 'linear';
      const easingFn = CONFIG.easings[easingName] || CONFIG.easings.linear;
      
      // 循环动画特殊处理
      if (animation.cycle) {
        const cycleDuration = animation.cycleDuration || 1;
        const cycleProgress = (progress % cycleDuration) / cycleDuration;
        const easedProgress = easingFn(cycleProgress);
        applyAnimationByType(animation, easedProgress, animationEffects);
      }
      // 关键帧动画特殊处理
      else if (animation.values && animation.keyTimes) {
        const value = getValueAtProgress(animation.values, animation.keyTimes, progress);
        switch (animation.type) {
          case 'opacity':
            animationEffects.opacity = value;
            break;
          // 可以根据需要添加其他类型
        }
      }
      // 普通动画
      else {
        const easedProgress = easingFn(progress);
        applyAnimationByType(animation, easedProgress, animationEffects);
      }
    }
  }
  
  // 处理自定义运动路径
  if (attributes.path) {
    try {
      // 解析SVG路径或关键点
      const path = parsePath(attributes.path);
      const pathPoint = getPointOnPath(path, progress);
      animationEffects.x = pathPoint.x;
      animationEffects.y = pathPoint.y;
    } catch (e) {
      console.error('路径解析错误:', e);
    }
  }
  
  return {
    fadeInProgress,
    fadeOutProgress,
    animationEffects,
    progress
  };
};

// 辅助函数：解析位置字符串
const parsePositionString = (posStr) => {
  if (!posStr) return null;
  
  // 处理预定义位置
  if (CONFIG.positions[posStr]) {
    const pos = CONFIG.positions[posStr];
    return {
      x: pos.x * CONFIG.video.width,
      y: pos.y * CONFIG.video.height
    };
  }
  
  // 处理坐标形式 "x,y"
  if (posStr.includes(',')) {
    const [x, y] = posStr.split(',').map(parseFloat);
    return {
      x: x * CONFIG.video.width,
      y: y * CONFIG.video.height
    };
  }
  
  // 处理百分比形式
  if (posStr.includes('%')) {
    const [xPercent, yPercent] = posStr.split('%,').map(v => parseFloat(v) / 100);
    return {
      x: xPercent * CONFIG.video.width,
      y: yPercent * CONFIG.video.height
    };
  }
  
  return null;
};

// 辅助函数：解析路径
const parsePath = (pathStr) => {
  // 简单路径解析 - 格式: "x1,y1 x2,y2 x3,y3..."
  if (pathStr.includes(' ')) {
    return pathStr.split(' ').map(point => {
      const [x, y] = point.split(',').map(parseFloat);
      return {
        x: x * CONFIG.video.width,
        y: y * CONFIG.video.height
      };
    });
  }
  
  // 更复杂的路径可以实现SVG路径解析
  return [];
};

// 辅助函数：根据进度获取路径上的点
const getPointOnPath = (path, progress) => {
  if (!path.length) return {x: 0, y: 0};
  
  // 线性插值计算路径上的点
  const pathLength = path.length - 1;
  const exactIndex = progress * pathLength;
  const index1 = Math.floor(exactIndex);
  const index2 = Math.min(index1 + 1, pathLength);
  const localProgress = exactIndex - index1;
  
  const point1 = path[index1];
  const point2 = path[index2];
  
  return {
    x: point1.x + (point2.x - point1.x) * localProgress,
    y: point1.y + (point2.y - point1.y) * localProgress
  };
};

// 辅助函数：根据动画类型应用效果
const applyAnimationByType = (animation, progress, effects) => {
  switch (animation.type) {
    case 'opacity':
      effects.opacity = animation.from + (animation.to - animation.from) * progress;
      break;
      
    case 'position':
      effects.x = animation.from.x + (animation.to.x - animation.from.x) * progress;
      effects.y = animation.from.y + (animation.to.y - animation.from.y) * progress;
      break;
      
    case 'positionOffset':
      effects.xOffset = (animation.fromX + (animation.toX - animation.fromX) * progress) * CONFIG.video.width;
      effects.yOffset = (animation.fromY + (animation.toY - animation.fromY) * progress) * CONFIG.video.height;
      break;
      
    case 'positionOffsetPattern':
      const xPatternIdx = Math.floor(progress * (animation.xPattern.length - 1));
      const yPatternIdx = Math.floor(progress * (animation.yPattern.length - 1));
      
      const xOffset = animation.xPattern[xPatternIdx];
      const yOffset = animation.yPattern[yPatternIdx];
      
      effects.xOffset = animation.relative ? xOffset : xOffset * CONFIG.video.width;
      effects.yOffset = animation.relative ? yOffset : yOffset * CONFIG.video.height;
      break;
      
    case 'scale':
      if (animation.scaleXFrom !== undefined) {
        effects.scaleX = animation.scaleXFrom + (animation.scaleXTo - animation.scaleXFrom) * progress;
        effects.scaleY = animation.scaleYFrom + (animation.scaleYTo - animation.scaleYFrom) * progress;
      } else {
        effects.scaleX = animation.from + (animation.to - animation.from) * progress;
        effects.scaleY = animation.from + (animation.to - animation.from) * progress;
      }
      break;
      
    case 'rotation':
      effects.rotation = animation.from + (animation.to - animation.from) * progress;
      break;
      
    case 'color':
      effects.color = interpolateColor(animation.from, animation.to, progress);
      break;
      
    case 'blur':
      effects.blur = animation.from + (animation.to - animation.from) * progress;
      break;
      
    case 'special':
      if (animation.effect === 'typewriter') {
        effects.typewriter = {
          progress: progress, 
          speed: animation.speed || 0.1
        };
      }
      break;
  }
};

// 辅助函数：在关键帧之间插值
const getValueAtProgress = (values, keyTimes, progress) => {
  // 找到当前进度所在的关键帧区间
  let startIdx = 0;
  while (startIdx < keyTimes.length - 1 && progress > keyTimes[startIdx + 1]) {
    startIdx++;
  }
  
  const endIdx = Math.min(startIdx + 1, keyTimes.length - 1);
  
  // 计算区间内的相对进度
  const startTime = keyTimes[startIdx];
  const endTime = keyTimes[endIdx];
  const intervalProgress = (progress - startTime) / (endTime - startTime || 1);
  
  // 线性插值计算当前值
  return values[startIdx] + (values[endIdx] - values[startIdx]) * intervalProgress;
};

// 辅助函数：颜色插值 (十六进制颜色之间的插值)
const interpolateColor = (color1, color2, progress) => {
  // 解析十六进制颜色
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  // 插值计算
  const r = Math.round(r1 + (r2 - r1) * progress);
  const g = Math.round(g1 + (g2 - g1) * progress);
  const b = Math.round(b1 + (b2 - b1) * progress);
  
  // 转回十六进制
  return `#${(r).toString(16).padStart(2, '0')}${
    (g).toString(16).padStart(2, '0')}${
    (b).toString(16).padStart(2, '0')}`;
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
  
  // 应用新增动画效果
  if (animation.animationEffects.xOffset !== undefined) {
    konvaProps.x += animation.animationEffects.xOffset;
  } else if (animation.animationEffects.x) {
    konvaProps.x += animation.animationEffects.x;
  }
  
  if (animation.animationEffects.yOffset !== undefined) {
    konvaProps.y += animation.animationEffects.yOffset;
  } else if (animation.animationEffects.y) {
    konvaProps.y += animation.animationEffects.y;
  }
  
  if (animation.animationEffects.scaleX) {
    konvaProps.scaleX = animation.animationEffects.scaleX;
    konvaProps.scaleY = animation.animationEffects.scaleY;
  }
  
  // 应用旋转动画
  if (animation.animationEffects.rotation !== undefined) {
    konvaProps.rotation = animation.animationEffects.rotation;
  }
  
  // 应用颜色动画
  if (animation.animationEffects.color) {
    konvaProps.fill = animation.animationEffects.color;
  }
  
  // 应用模糊效果
  if (animation.animationEffects.blur !== undefined) {
    konvaProps.blurRadius = animation.animationEffects.blur;
  }
  
  const lines = text.split('，');
  const lineSpacing = parseInt(attributes.lineSpacing) || CONFIG.rendering.lineSpacing;
  const totalHeight = (lines.length - 1) * lineSpacing;
  
  // 特殊处理打字机效果
  const typewriterEffect = animation.animationEffects.typewriter;
  if (typewriterEffect) {
    // 将每一行处理为打字机效果
    lines.forEach((line, i) => {
      const charCount = line.length;
      const charsToShow = Math.ceil(charCount * typewriterEffect.progress / typewriterEffect.speed);
      const displayText = line.substring(0, charsToShow);
      
      const textNode = new Konva.Text({
        ...konvaProps,
        text: displayText,
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
  } else {
    // 常规文本处理
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
  }
  
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
