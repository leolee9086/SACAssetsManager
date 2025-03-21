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
