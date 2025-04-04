// 缓存阶乘结果
const 阶乘缓存 = new Map([[0, 1], [1, 1]]);
const 阶乘 = n => {
  if (阶乘缓存.has(n)) return 阶乘缓存.get(n);
  const result = n * 阶乘(n - 1);
  阶乘缓存.set(n, result);
  return result;
}

// 缓存组合数结果
const 组合数缓存 = new Map();
const 组合数 = (n, k) => {
  const key = `${n},${k}`;
  if (组合数缓存.has(key)) return 组合数缓存.get(key);
  const result = 阶乘(n) / (阶乘(k) * 阶乘(n - k));
  组合数缓存.set(key, result);
  return result;
}

/**
 * 计算贝塞尔曲线上的点 (一维数组版本)
 * @param {number[]} 控制点数组 - [x0,y0, x1,y1, ...]
 * @param {number} t - 参数值 [0,1]
 * @returns {number[]} - [x, y]
 */
export const 计算贝塞尔点 = (控制点数组, t) => {
  const n = (控制点数组.length >> 1) - 1;
  const mt = 1 - t;
  let x = 0, y = 0;
  
  for (let i = 0; i <= n; i++) {
    const 基函数值 = 组合数(n, i) * Math.pow(t, i) * Math.pow(mt, n - i);
    const idx = i << 1;
    x += 控制点数组[idx] * 基函数值;
    y += 控制点数组[idx + 1] * 基函数值;
  }
  
  return [x, y];
}

/**
 * 生成贝塞尔曲线的点集 (一维数组版本)
 * @param {number[]} 控制点数组 - [x0,y0, x1,y1, ...]
 * @param {number} 点数 - 生成的点数量
 * @returns {number[]} - [x0,y0, x1,y1, ...]
 */
export const 生成贝塞尔曲线点集 = (控制点数组, 点数 = 100) => {
  const 步长 = 1 / (点数 - 1);
  const 结果 = new Array(点数 * 2);
  
  for (let i = 0; i < 点数; i++) {
    const 点 = 计算贝塞尔点(控制点数组, i * 步长);
    结果[i * 2] = 点[0];
    结果[i * 2 + 1] = 点[1];
  }
  
  return 结果;
}
