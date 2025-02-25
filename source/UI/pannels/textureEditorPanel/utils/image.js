
/**
 * 将图像逆时针旋转120度
 * @param {HTMLImageElement|HTMLCanvasElement} image - 要旋转的图像
 * @returns {HTMLCanvasElement} 旋转后的Canvas元素
 */
export const rotateImage120CounterClockwise = (image) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸与原图相同
    canvas.width = image.width || image.naturalWidth;
    canvas.height = image.height || image.naturalHeight;
    
    // 将原点移到canvas中心
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // 逆时针旋转120度（2π/3弧度）
    ctx.rotate(0-(2 * Math.PI) / 6);
    
    // 绘制旋转后的图像，注意需要将图像中心与canvas原点对齐
    ctx.drawImage(
      image,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );
    
    return canvas;
  };
  
  /**
   * 加载图像并设置默认图像,使用"6"是因为这个数字可以比较好的显示出对称群特性
   * @param {Array} rasterImagesConfig - 光栅图像配置数组
   * @returns {Array} 更新后的光栅图像数组
   */
  export const loadImagesWithDefaults = (rasterImagesConfig) => {
    // 深拷贝配置，避免修改原始数据
    const rasterImages = JSON.parse(JSON.stringify(rasterImagesConfig));
    
    // 为每个图像设置默认图像
    rasterImages.forEach((image, index) => {
      const defaultImg = createDefaultImage((6).toString());
      // 应用120度逆时针旋转
      image.config.image = rotateImage120CounterClockwise(defaultImg);
      
      // 尝试加载实际图像（如果有的话）
      const img = new Image();
      img.onload = () => {
        // 加载成功后应用120度逆时针旋转
        image.config.image = rotateImage120CounterClockwise(img);
      };
      img.src = `/path/to/texture${index + 1}.jpg`; // 替换为实际的图像路径
    });
    
    return rasterImages;
  }; 

  
/**
 * 创建默认图像
 * @param {string} text - 要显示在图像上的文本
 * @returns {HTMLCanvasElement} 包含文本的Canvas元素
 */
export const createDefaultImage = (text) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100;
    canvas.height = 100;
    ctx.fillStyle = 'black';
    ctx.font = '90px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return canvas;
  };
  