export  async function convertToVP9Frame(imageBitmap) {
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    
    // 绘制并转换颜色空间
    ctx.drawImage(imageBitmap, 0, 0);
    
    // 使用ImageData获取原始像素数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 将像素数据转换为Uint8Array
    const rgbaData = new Uint8Array(imageData.data.buffer);
    
    // 转换为VP9兼容的I420格式（YUV）
    const yuvData = rgbaToI420(rgbaData, canvas.width, canvas.height);
    
    return yuvData;
  }

function rgbaToI420(rgba, width, height) {
  const yPlane = new Uint8Array(width * height);
  const uPlane = new Uint8Array((width * height) >> 2);
  const vPlane = new Uint8Array((width * height) >> 2);
  let yIndex = 0;
  let uIndex = 0;
  let vIndex = 0;

  // YUV转换系数 (BT.601标准)
  const kr = 0.299;
  const kg = 0.587;
  const kb = 0.114;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = rgba[(y * width + x) * 4];
      const g = rgba[(y * width + x) * 4 + 1];
      const b = rgba[(y * width + x) * 4 + 2];

      // 计算Y分量
      yPlane[yIndex++] = ((kr * r) + (kg * g) + (kb * b)) | 0;

      // 每2x2像素采样一次UV分量
      if ((x % 2 === 0) && (y % 2 === 0)) {
        let uSum = 0, vSum = 0;
        
        // 采样2x2区域
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const px = Math.min(x + dx, width - 1);
            const py = Math.min(y + dy, height - 1);
            
            const r = rgba[(py * width + px) * 4];
            const g = rgba[(py * width + px) * 4 + 1];
            const b = rgba[(py * width + px) * 4 + 2];

            // 计算UV分量
            const u = ((-0.147 * r) - (0.289 * g) + (0.436 * b) + 128) | 0;
            const v = ((0.615 * r) - (0.515 * g) - (0.100 * b) + 128) | 0;
            
            uSum += u;
            vSum += v;
          }
        }

        uPlane[uIndex++] = Math.max(0, Math.min(255, uSum / 4));
        vPlane[vIndex++] = Math.max(0, Math.min(255, vSum / 4));
      }
    }
  }

  // 合并YUV平面
  const yuv = new Uint8Array(yPlane.length + uPlane.length + vPlane.length);
  yuv.set(yPlane);
  yuv.set(uPlane, yPlane.length);
  yuv.set(vPlane, yPlane.length + uPlane.length);
  
  return yuv;
}

