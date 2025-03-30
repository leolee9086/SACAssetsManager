/**
 * 创建画布, 默认宽高为1024,高宽比为16:9
 * @param {*} options 
 * @returns 
 */
export const createCanvasWithOptions = (options={width:1024, height:576}) => {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  return canvas;
};

/**
 * 创建全屏大小的画布
 * @returns {HTMLCanvasElement}
 */
export const createFullScreenCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return canvas;
};

/**
 * 创建指定宽高的画布(简化版)
 * @param {number} width 
 * @param {number} height 
 * @returns {HTMLCanvasElement}
 */
export const createCanvas = (width, height) => {
  return createCanvasWithOptions({width, height});
};

/**
 * 创建正方形画布
 * @param {number} size 边长
 * @returns {HTMLCanvasElement}
 */
export const createSquareCanvas = (size) => {
  return createCanvasWithOptions({width: size, height: size});
};

/**
 * 创建基于容器元素的画布(自动适应容器尺寸)
 * @param {HTMLElement} container 
 * @returns {HTMLCanvasElement}
 */
export const createCanvasForContainer = (container) => {
  const rect = container.getBoundingClientRect();
  return createCanvasWithOptions({
    width: rect.width,
    height: rect.height
  });
};
