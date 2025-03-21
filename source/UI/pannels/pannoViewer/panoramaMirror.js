import {saveImageData} from '../../../../src/toolBox/useAge/forImageAndCanvas/forSave.js';
export {saveImageData};
import {modifyImageData} from '../../../../src/toolBox/useAge/forImageAndCanvas/forImageDataEdit.js';
import { canvasPool } from '../../../../src/toolBox/useAge/forImageAndCanvas/useCanvasPool.js';

export function mirrorImageData(imageData, axis = 'x') {
  return modifyImageData(imageData, (canvas, ctx) => {
    // 从池中获取临时画布而不是创建新的
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
  });
}

