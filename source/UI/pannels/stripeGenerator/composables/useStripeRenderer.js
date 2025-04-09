import { ref, onMounted, watch } from '../../../../../static/vue.esm-browser.js';

/**
 * 条纹渲染逻辑组合函数
 * @param {Object} options - 渲染选项
 * @returns {Object} 渲染相关数据和方法
 */
export function useStripeRenderer(options = {}) {
  const {
    initialWidth = 500,
    initialHeight = 300,
    initialStripeWidth = 50,
    initialSymmetry = false,
    initialStripes = [],
    initialColors = [],
  } = options;
  
  // 画布和尺寸
  const canvas = ref(null);
  const width = ref(initialWidth);
  const height = ref(initialHeight);
  
  // 条纹设置
  const stripeWidth = ref(initialStripeWidth);
  const stripeWidths = ref(initialStripes.length ? [...initialStripes] : []);
  const stripeColors = ref(initialColors.length ? [...initialColors] : []);
  const symmetryEnabled = ref(initialSymmetry);
  
  // 背景设置
  const backgroundImage = ref(null);
  const backgroundPreviewUrl = ref('');
  const blendMode = ref('multiply');
  const backgroundOpacity = ref(1);
  
  // 条纹透明度设置
  const stripeOpacity = ref(1);
  
  // 初始化条纹数据
  const initStripes = (count = 10) => {
    // 默认创建指定数量的条纹
    stripeWidths.value = Array(count).fill(stripeWidth.value);
    
    // 初始化颜色，循环使用一些默认颜色
    const defaultColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    stripeColors.value = Array(count).fill(0).map((_, i) => 
      defaultColors[i % defaultColors.length]
    );
  };
  
  // 绘制条纹
  const drawStripes = () => {
    if (!canvas.value) return;
    
    const ctx = canvas.value.getContext('2d');
    
    // 清除画布
    ctx.clearRect(0, 0, width.value, height.value);
    
    // 先绘制条纹
    drawStripePatterns();
    
    // 如果有背景图，则绘制背景
    if (backgroundImage.value && backgroundPreviewUrl.value) {
      const img = new Image();
      img.onload = () => {
        // 保存当前上下文
        ctx.save();
        
        // 设置混合模式
        ctx.globalCompositeOperation = blendMode.value;
        
        // 设置透明度
        ctx.globalAlpha = backgroundOpacity.value;
        
        // 绘制背景图
        const imgRatio = img.width / img.height;
        const canvasRatio = width.value / height.value;
        
        let drawWidth, drawHeight, x, y;
        
        if (imgRatio > canvasRatio) {
          // 图像更宽，以高度为基准
          drawHeight = height.value;
          drawWidth = img.width * (height.value / img.height);
          x = (width.value - drawWidth) / 2;
          y = 0;
        } else {
          // 图像更高，以宽度为基准
          drawWidth = width.value;
          drawHeight = img.height * (width.value / img.width);
          x = 0;
          y = (height.value - drawHeight) / 2;
        }
        
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        // 恢复上下文
        ctx.restore();
        
        // 在条纹之上应用混合模式，所以不需要重新绘制条纹
      };
      img.src = backgroundPreviewUrl.value;
    }
  };
  
  // 绘制条纹图案
  const drawStripePatterns = () => {
    if (!canvas.value) return;
    
    const ctx = canvas.value.getContext('2d');
    
    // 计算总宽度
    const totalWidth = stripeWidths.value.reduce((sum, width) => sum + width, 0);
    
    // 设置条纹透明度
    ctx.save();
    ctx.globalAlpha = stripeOpacity.value;
    
    // 先清除整个画布
    ctx.clearRect(0, 0, width.value, height.value);
    
    if (symmetryEnabled.value) {
      // 对称模式：只在左半边绘制
      let canvasHalfWidth = Math.floor(width.value / 2);
      let currentX = 0;
      
      // 绘制条纹到左半部分
      for (let i = 0; i < stripeWidths.value.length; i++) {
        const stripeWidth = stripeWidths.value[i];
        const color = stripeColors.value[i];
        
        // 计算条纹宽度在左半部分画布上的实际像素宽度
        const actualWidth = (stripeWidth / totalWidth) * canvasHalfWidth;
        
        ctx.fillStyle = color;
        ctx.fillRect(currentX, 0, actualWidth, height.value);
        
        currentX += actualWidth;
      }
      
      // 获取左半部分的图像数据
      const leftHalfImageData = ctx.getImageData(0, 0, canvasHalfWidth, height.value);
      
      // 创建临时canvas用于水平翻转
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasHalfWidth;
      tempCanvas.height = height.value;
      const tempCtx = tempCanvas.getContext('2d');
      
      // 将左半部分复制到临时canvas
      tempCtx.putImageData(leftHalfImageData, 0, 0);
      
      // 翻转并绘制到右侧
      ctx.save();
      ctx.translate(width.value, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(tempCanvas, 0, 0, canvasHalfWidth, height.value);
      ctx.restore();
    } else {
      // 非对称模式：占满整个画布
      let currentX = 0;
      
      // 绘制条纹
      for (let i = 0; i < stripeWidths.value.length; i++) {
        const stripeWidth = stripeWidths.value[i];
        const color = stripeColors.value[i];
        
        // 计算条纹宽度在整个画布上的实际像素宽度
        const actualWidth = (stripeWidth / totalWidth) * width.value;
        
        ctx.fillStyle = color;
        ctx.fillRect(currentX, 0, actualWidth, height.value);
        
        currentX += actualWidth;
      }
    }
    
    // 恢复透明度设置
    ctx.restore();
  };
  
  // 下载贴图
  const downloadTexture = (options = {}) => {
    if (!canvas.value) return;
    
    const {
      format = 'png',
      quality = 0.8,
      filename = '条纹贴图',
      useCustomSize = false,
      customWidth = width.value,
      customHeight = height.value
    } = options;
    
    try {
      let dataURL;
      let finalCanvas = canvas.value;
      
      // 如果使用自定义尺寸，创建一个新的画布
      if (useCustomSize && (customWidth !== width.value || customHeight !== height.value)) {
        // 创建临时画布
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = customWidth;
        tempCanvas.height = customHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 绘制原画布内容到临时画布，进行缩放
        tempCtx.drawImage(
          canvas.value, 
          0, 0, width.value, height.value,
          0, 0, customWidth, customHeight
        );
        
        finalCanvas = tempCanvas;
      }
      
      // 根据选择的格式和质量生成图片
      if (format === 'png') {
        dataURL = finalCanvas.toDataURL('image/png');
      } else if (format === 'jpeg') {
        dataURL = finalCanvas.toDataURL('image/jpeg', quality);
      } else if (format === 'webp') {
        dataURL = finalCanvas.toDataURL('image/webp', quality);
      }
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = dataURL;
      
      // 设置文件名
      const fileExtension = format === 'jpeg' ? 'jpg' : format;
      const downloadFileName = filename || '条纹贴图';
      link.download = `${downloadFileName}.${fileExtension}`;
      
      // 模拟点击进行下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('下载贴图失败:', error);
      return false;
    }
  };
  
  // 处理背景图片
  const handleBackgroundImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return false;
    
    backgroundImage.value = file;
    backgroundPreviewUrl.value = URL.createObjectURL(file);
    drawStripes();
    return true;
  };
  
  // 清除背景图片
  const clearBackground = () => {
    backgroundImage.value = null;
    if (backgroundPreviewUrl.value) {
      URL.revokeObjectURL(backgroundPreviewUrl.value);
    }
    backgroundPreviewUrl.value = '';
    drawStripes();
  };
  
  // 条纹操作方法
  const stripeOperations = {
    // 重置单个条纹宽度
    resetStripeWidth: (index) => {
      stripeWidths.value[index] = stripeWidth.value;
      drawStripes();
    },
    
    // 重置所有条纹宽度
    resetAllStripeWidths: () => {
      stripeWidths.value = Array(stripeWidths.value.length).fill(stripeWidth.value);
      drawStripes();
    },
    
    // 添加一个条纹
    addStripe: () => {
      stripeWidths.value.push(stripeWidth.value);
      
      // 使用循环颜色
      const defaultColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
      const colorIndex = stripeColors.value.length % defaultColors.length;
      stripeColors.value.push(defaultColors[colorIndex]);
      
      drawStripes();
    },
    
    // 在指定位置后插入条纹
    insertStripeAfter: (index) => {
      stripeWidths.value.splice(index + 1, 0, stripeWidth.value);
      
      // 使用循环颜色
      const defaultColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
      const colorIndex = (index + 1) % defaultColors.length;
      stripeColors.value.splice(index + 1, 0, defaultColors[colorIndex]);
      
      drawStripes();
    },
    
    // 删除一个条纹
    removeStripe: (index) => {
      stripeWidths.value.splice(index, 1);
      stripeColors.value.splice(index, 1);
      drawStripes();
    },
    
    // 复制一个条纹
    duplicateStripe: (index) => {
      const newColor = stripeColors.value[index];
      const newWidth = stripeWidths.value[index];
      
      stripeWidths.value.splice(index + 1, 0, newWidth);
      stripeColors.value.splice(index + 1, 0, newColor);
      drawStripes();
    },
    
    // 条纹整体移动
    moveAllStripes: (direction) => {
      if (direction === 'up') {
        // 将第一个元素移到最后
        const firstWidth = stripeWidths.value.shift();
        const firstColor = stripeColors.value.shift();
        
        stripeWidths.value.push(firstWidth);
        stripeColors.value.push(firstColor);
      } else if (direction === 'down') {
        // 将最后一个元素移到最前
        const lastWidth = stripeWidths.value.pop();
        const lastColor = stripeColors.value.pop();
        
        stripeWidths.value.unshift(lastWidth);
        stripeColors.value.unshift(lastColor);
      }
      drawStripes();
    },
    
    // 反向排序
    reverseStripes: () => {
      stripeWidths.value.reverse();
      stripeColors.value.reverse();
      drawStripes();
    },
    
    // 单个条纹的上下移动
    moveStripe: (index, direction) => {
      if (index < 0 || index >= stripeWidths.value.length) return;
      
      const currentWidth = stripeWidths.value[index];
      const currentColor = stripeColors.value[index];
      
      if (direction === 'up' && index > 0) {
        stripeWidths.value.splice(index, 1);
        stripeWidths.value.splice(index - 1, 0, currentWidth);
        stripeColors.value.splice(index, 1);
        stripeColors.value.splice(index - 1, 0, currentColor);
      } else if (direction === 'down' && index < stripeWidths.value.length - 1) {
        stripeWidths.value.splice(index, 1);
        stripeWidths.value.splice(index + 1, 0, currentWidth);
        stripeColors.value.splice(index, 1);
        stripeColors.value.splice(index + 1, 0, currentColor);
      }
      drawStripes();
    }
  };
  
  // 计算单个条纹占总宽度的百分比
  const computeStripePercent = (index) => {
    const totalWidth = stripeWidths.value.reduce((sum, width) => sum + width, 0);
    if (totalWidth === 0) return 0;
    
    const percent = (stripeWidths.value[index] / totalWidth) * 100;
    return percent.toFixed(1);
  };
  
  // 监听各项参数变化，重绘画布
  watch([width, height, stripeWidths, stripeColors, symmetryEnabled], () => {
    drawStripes();
  }, { deep: true });
  
  // 监听背景相关参数变化
  watch([backgroundImage, blendMode, backgroundOpacity], () => {
    drawStripes();
  }, { deep: true });
  
  // 监听条纹透明度变化
  watch([stripeOpacity], () => {
    drawStripes();
  });
  
  // 组件挂载时初始化
  onMounted(() => {
    if (stripeWidths.value.length === 0) {
      initStripes();
    }
    drawStripes();
  });
  
  return {
    // 基础引用
    canvas,
    width,
    height,
    stripeWidth,
    stripeWidths,
    stripeColors,
    symmetryEnabled,
    
    // 背景相关
    backgroundImage,
    backgroundPreviewUrl,
    blendMode,
    backgroundOpacity,
    
    // 条纹透明度
    stripeOpacity,
    
    // 方法
    initStripes,
    drawStripes,
    drawStripePatterns,
    downloadTexture,
    handleBackgroundImage,
    clearBackground,
    computeStripePercent,
    
    // 条纹操作
    ...stripeOperations
  };
} 