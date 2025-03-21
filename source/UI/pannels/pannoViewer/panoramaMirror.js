import {saveImageData} from '../../../../src/toolBox/useAge/forImageAndCanvas/forSave.js';
export {saveImageData};
export function mirrorImageData(imageData, axis = 'x') {
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

