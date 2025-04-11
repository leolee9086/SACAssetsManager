/**
 * 水印工具模块 - 提供对视频/图像添加水印的功能
 */

/**
 * 在画布上添加文字水印
 * @param {HTMLCanvasElement} canvas - 要添加水印的画布
 * @param {Object} options - 水印配置选项
 * @param {string} options.text - 水印文字内容
 * @param {string} options.position - 水印位置 ('topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center')
 * @param {string} options.font - 字体设置，如 '24px Arial'
 * @param {string} options.color - 文字颜色，如 'rgba(255, 255, 255, 0.8)'
 * @param {number} options.padding - 距离边缘的内边距（像素）
 */
export function addTextWatermark(canvas, options) {
  const ctx = canvas.getContext('2d');
  const { 
    text = '水印文字', 
    position = 'bottomRight', 
    font = `${Math.max(16, canvas.width / 50)}px Arial`,
    color = 'rgba(255, 255, 255, 0.8)',
    padding = Math.max(10, canvas.width / 100)
  } = options;
  
  // 设置样式
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  
  // 测量文本尺寸
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  // 估算文本高度（没有直接的API）
  const fontSizeMatch = font.match(/(\d+)px/);
  const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 16;
  const textHeight = fontSize;
  
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
  ctx.fillText(text, x, y);
}

/**
 * 在画布上添加图片水印
 * @param {HTMLCanvasElement} canvas - 要添加水印的画布
 * @param {Object} options - 水印配置选项
 * @param {HTMLImageElement} options.image - 水印图片对象
 * @param {string} options.position - 水印位置 ('topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center')
 * @param {number} options.width - 图片宽度，默认为原图宽度，可以指定为画布宽度的百分比（如0.2）
 * @param {number} options.height - 图片高度，默认为自动按比例计算
 * @param {number} options.opacity - 透明度 (0-1)
 * @param {number} options.padding - 距离边缘的内边距（像素）
 */
export function addImageWatermark(canvas, options) {
  const ctx = canvas.getContext('2d');
  const { 
    image, 
    position = 'bottomRight', 
    width, 
    height, 
    opacity = 0.8,
    padding = Math.max(10, canvas.width / 100)
  } = options;
  
  // 检查图片是否有效
  if (!image || !image.complete || image.naturalWidth === 0) {
    console.error('水印图片无效或未加载完成');
    return;
  }
  
  // 计算图片尺寸
  let imgWidth = width;
  let imgHeight = height;
  
  // 如果宽度是小数，视为画布宽度的百分比
  if (typeof width === 'number' && width < 1) {
    imgWidth = canvas.width * width;
  } else if (!width) {
    // 如果未指定宽度，使用原始宽度，但最大为画布宽度的20%
    imgWidth = Math.min(image.naturalWidth, canvas.width * 0.2);
  }
  
  // 如果未指定高度，按宽度比例计算
  if (!imgHeight) {
    const ratio = image.naturalHeight / image.naturalWidth;
    imgHeight = imgWidth * ratio;
  }
  
  // 根据位置计算坐标
  let x, y;
  switch(position) {
    case 'topLeft':
      x = padding;
      y = padding;
      break;
    case 'topRight':
      x = canvas.width - imgWidth - padding;
      y = padding;
      break;
    case 'bottomLeft':
      x = padding;
      y = canvas.height - imgHeight - padding;
      break;
    case 'bottomRight':
      x = canvas.width - imgWidth - padding;
      y = canvas.height - imgHeight - padding;
      break;
    case 'center':
      x = (canvas.width - imgWidth) / 2;
      y = (canvas.height - imgHeight) / 2;
      break;
    default:
      x = canvas.width - imgWidth - padding;
      y = canvas.height - imgHeight - padding;
  }
  
  // 绘制图片水印
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, x, y, imgWidth, imgHeight);
  ctx.globalAlpha = 1.0; // 恢复默认透明度
}

/**
 * 预加载水印图片
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<HTMLImageElement>} - 加载完成的图片
 */
export function loadWatermarkImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`水印图片加载失败: ${e.message}`));
    img.src = imageUrl;
  });
} 