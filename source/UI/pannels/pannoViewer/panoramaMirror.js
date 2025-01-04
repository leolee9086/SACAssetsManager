export function mirrorPanorama(imageData, axis = 'x') {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  
  // 先把 ImageData 画到 canvas 上
  ctx.putImageData(imageData, 0, 0);
  
  // 创建新的 canvas 进行镜像
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = imageData.width;
  resultCanvas.height = imageData.height;
  const resultCtx = resultCanvas.getContext('2d');
  
  // 使用 scale 进行镜像变换
  if (axis === 'x') {
    resultCtx.scale(-1, 1);
    resultCtx.drawImage(canvas, -canvas.width, 0);
  } else if (axis === 'y') {
    resultCtx.scale(1, -1);
    resultCtx.drawImage(canvas, 0, -canvas.height);
  }
  
  return resultCtx.getImageData(0, 0, imageData.width, imageData.height);
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