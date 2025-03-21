import {saveImageData} from '../../../../src/toolBox/useAge/forImageAndCanvas/forSave.js';
export {saveImageData};

function modifyImageData(imageData, ctxFunction) {
  // 参数验证
  if (!imageData || !ctxFunction || typeof ctxFunction !== 'function') {
    throw new Error('无效的参数');
  }
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  // 将图像数据绘制到临时画布
  ctx.putImageData(imageData, 0, 0);
  // 应用自定义操作
  ctxFunction(canvas);
  // 返回修改后的图像数据
  return ctx.getImageData(0, 0, imageData.width, imageData.height);
}

export function mirrorImageData(imageData, axis = 'x') {
  return modifyImageData(imageData, (canvas) => {
    const ctx = canvas.getContext('2d');
    
    // 创建临时画布存储原始图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    // 清除主画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 根据指定轴进行镜像变换
    if (axis === 'x') {
      ctx.scale(-1, 1);
      ctx.drawImage(tempCanvas, -canvas.width, 0);
    } else if (axis === 'y') {
      ctx.scale(1, -1);
      ctx.drawImage(tempCanvas, 0, -canvas.height);
    } else {
      // 同时沿x和y轴镜像
      ctx.scale(-1, -1);
      ctx.drawImage(tempCanvas, -canvas.width, -canvas.height);
    }
  });
}

