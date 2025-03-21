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
