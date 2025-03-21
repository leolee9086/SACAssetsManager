import { canvasPool } from './useCanvasPool.js';

export function modifyImageData(imageData, ctxFunction) {
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
    const ctxFunction = (canvas, ctx) => {
      const tempCanvas = canvasPool.getCanvas(canvas.width, canvas.height);
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
    }
    return modifyImageData(imageData, ctxFunction);
  }
  