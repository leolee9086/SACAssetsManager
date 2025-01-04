export async function mirrorPanorama(imageData, axis = 'x') {
  const { width: cols, height: rows, data } = imageData;
  const result = new Uint8ClampedArray(data.length);
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // 转换到球面坐标
      const theta = (j / cols) * 2 * Math.PI - Math.PI;  // 经度 (-π to π)
      const phi = (i / rows) * Math.PI;                  // 纬度 (0 to π)
      
      // 计算3D笛卡尔坐标
      let x = Math.sin(phi) * Math.cos(theta);
      let y = Math.sin(phi) * Math.sin(theta);
      let z = Math.cos(phi);
      
      // 执行镜像变换
      switch (axis) {
        case 'x': x = -x; break;
        case 'y': y = -y; break;
        case 'z': z = -z; break;
      }
      
      // 转回球面坐标
      const thetaNew = Math.atan2(y, x);
      const phiNew = Math.acos(z / Math.sqrt(x*x + y*y + z*z));
      
      // 计算目标像素坐标
      let sampleX = Math.round(((thetaNew + Math.PI) / (2 * Math.PI)) * cols);
      let sampleY = Math.round((phiNew / Math.PI) * rows);
      
      // 处理边界情况
      sampleX = (sampleX + cols) % cols;
      sampleY = Math.min(Math.max(sampleY, 0), rows - 1);
      
      // 复制像素数据
      const currentPixel = (i * cols + j) * 4;
      const sourcePixel = (sampleY * cols + sampleX) * 4;
      
      result[currentPixel] = data[sourcePixel];         // R
      result[currentPixel + 1] = data[sourcePixel + 1]; // G
      result[currentPixel + 2] = data[sourcePixel + 2]; // B
      result[currentPixel + 3] = data[sourcePixel + 3]; // A
    }
  }
  
  return new ImageData(result, cols, rows);
}

// 添加保存图片的辅助函数
export function saveImageData(imageData, fileName = 'mirrored_panorama.jpg') {
  // 创建临时 canvas 用于转换 ImageData 到 Blob
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  // 转换为 blob 并保存
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95); // 使用 95% 的质量
} 