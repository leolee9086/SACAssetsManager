import {saveImageData} from '../../../../src/toolBox/useAge/forImageAndCanvas/forSave.js';
export {saveImageData};

// 创建一个canvas池，避免重复创建DOM元素
const canvasPool = (() => {
  const pool = [];
  
  const getCanvas = (width, height) => {
    if (pool.length > 0) {
      const canvas = pool.pop();
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      return canvas;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };
  
  const releaseCanvas = (canvas) => {
    // 限制池大小防止内存占用过大
    if (pool.length < 10) {
      pool.push(canvas);
    }
  };
  
  return { getCanvas, releaseCanvas };
})();

function modifyImageData(imageData, ctxFunction) {
  if (!imageData || !ctxFunction || typeof ctxFunction !== 'function') {
    throw new Error('无效的参数');
  }
  
  const canvas = canvasPool.getCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  
  ctxFunction(canvas, ctx);
  
  const result = ctx.getImageData(0, 0, imageData.width, imageData.height);
  canvasPool.releaseCanvas(canvas);
  return result;
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
    
    // 在主画布上应用变换并绘制临时画布内容
    ctx.save();
    if (axis === 'x') {
      ctx.scale(-1, 1);
      ctx.drawImage(tempCanvas, -canvas.width, 0);
    } else if (axis === 'y') {
      ctx.scale(1, -1);
      ctx.drawImage(tempCanvas, 0, -canvas.height);
    } else {
      ctx.scale(-1, -1);
      ctx.drawImage(tempCanvas, -canvas.width, -canvas.height);
    }
    ctx.restore();
  });
}

