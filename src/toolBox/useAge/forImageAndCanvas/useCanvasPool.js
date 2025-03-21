// 创建一个canvas池，避免重复创建DOM元素
export const canvasPool = (() => {
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
  