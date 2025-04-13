/**
 * 批量全景导出组件 - 水印工具函数
 * 提供水印相关操作的函数集合
 */

/**
 * 在Canvas上添加文本水印
 * @param {HTMLCanvasElement} canvas - 目标Canvas
 * @param {Object} profile - 水印配置
 * @param {number} exportWidth - 导出宽度
 * @param {number} scaleRatio - 缩放比例
 */
export function addWatermarkToCanvas(canvas, profile, exportWidth, scaleRatio) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const { text, position, fontFamily, fontSize, color } = profile.watermark.text;
  
  // 计算与导出时相同比例的字体大小
  // 基准字体大小 - 中等大小时为24px或宽度的1/45
  const baseFontSize = Math.max(24 * scaleRatio, exportWidth / 45 * scaleRatio);
  // 应用用户设置的比例因子
  const fontSizePixels = baseFontSize * parseFloat(fontSize);
  
  // 设置样式
  ctx.font = `${Math.round(fontSizePixels)}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  
  // 测量文本尺寸
  const metrics = ctx.measureText(text || '全景视频');
  const textWidth = metrics.width;
  const textHeight = fontSizePixels;
  
  // 计算内边距 - 也应用相同的缩放比例
  const padding = Math.max(10 * scaleRatio, exportWidth / 100 * scaleRatio);
  
  // 根据位置计算坐标
  let x, y;
  switch(position) {
    case 'topLeft':
      x = padding;
      y = padding + textHeight / 2;
      break;
    case 'topRight':
      x = canvas.width - textWidth - padding;
      y = padding + textHeight / 2;
      break;
    case 'bottomLeft':
      x = padding;
      y = canvas.height - padding - textHeight / 2;
      break;
    case 'bottomRight':
      x = canvas.width - textWidth - padding;
      y = canvas.height - padding - textHeight / 2;
      break;
    case 'center':
      x = (canvas.width - textWidth) / 2;
      y = canvas.height / 2;
      break;
    default:
      x = padding;
      y = canvas.height - padding - textHeight / 2;
  }
  
  // 绘制文字
  ctx.fillText(text || '全景视频', x, y);
}

/**
 * 准备水印配置选项
 * @param {Object} profile - 水印设置配置
 * @param {number} videoWidth - 视频宽度
 * @returns {Object} 水印配置选项
 */
export function prepareWatermarkOptions(profile, videoWidth) {
  const options = {
    text: null,
    image: null
  };
  
  // 处理文字水印
  if (profile.watermark.text.enabled) {
    // 基准字体大小 - 标准大小(1.0)时为24px或宽度的1/45
    const baseFontSize = Math.max(24, videoWidth / 45);
    // 应用用户设置的比例因子
    const fontSize = baseFontSize * parseFloat(profile.watermark.text.fontSize);
    
    // 创建字体字符串，显式包含字体信息
    const fontStr = `${Math.round(fontSize)}px ${profile.watermark.text.fontFamily}`;
    
    options.text = {
      enabled: true,
      text: profile.watermark.text.text,
      position: profile.watermark.text.position,
      font: fontStr,
      color: profile.watermark.text.color,
      // 设置这些标志，使视频生成器知道这些值是被明确设置的
      fontWasSetExplicitly: true,
      paddingWasSetExplicitly: false // 内边距采用默认计算
    };

    console.log('准备文字水印配置:', {
      enabled: options.text.enabled,
      text: options.text.text,
      position: options.text.position,
      font: options.text.font
    });
  }
  
  // 处理图片水印
  if (profile.watermark.image.enabled && profile.watermark.image.preview) {
    options.image = {
      enabled: true,
      position: profile.watermark.image.position,
      width: profile.watermark.image.size, // 使用百分比表示的尺寸
      opacity: profile.watermark.image.opacity,
      paddingWasSetExplicitly: false // 内边距采用默认计算
    };

    console.log('准备图片水印配置:', {
      enabled: options.image.enabled,
      position: options.image.position,
      width: options.image.width,
      opacity: options.image.opacity
    });
  }
  
  return options;
}

/**
 * 更新文字水印颜色 (结合颜色选择器和透明度滑块)
 * @param {Object} profile - 配置
 */
export function updateTextWatermarkColor(profile) {
  const hex = profile.watermark.text.colorHex;
  const opacity = profile.watermark.text.opacity;
  
  // 将十六进制颜色转换为RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // 生成rgba颜色字符串
  profile.watermark.text.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * 获取预览用的字体大小
 * @param {number} size - 字体大小比例因子
 * @returns {string} CSS字体大小
 */
export function getFontSizePreview(size) {
  // 基准大小为18px
  const baseFontSize = 18;
  // 应用用户设置的比例因子
  return `${Math.round(baseFontSize * parseFloat(size))}px`;
}

/**
 * 判断是否有水印启用
 * @param {Object} profile - 水印配置
 * @returns {boolean} 是否有水印启用
 */
export function hasWatermarkEnabled(profile) {
  return profile.watermark.text.enabled || profile.watermark.image.enabled;
} 