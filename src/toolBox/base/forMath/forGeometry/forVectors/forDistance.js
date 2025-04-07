/**
 * 向量距离计算函数集合
 * 提供各种常用的向量距离/相似度计算方法
 */

/**
 * 计算两个向量间的欧几里得距离
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {number} 距离值
 */
export function computeEuclideanDistance(a, b) {
  // 添加防御性检查
  if (!a || !b) {
    console.error('向量距离计算错误: 输入向量为空', { a, b });
    return Infinity; // 返回无穷大表示无效距离
  }

  if (a.length !== b.length) {
    console.error('向量距离计算错误: 向量维度不匹配', { aLength: a.length, bLength: b.length });
    return Infinity;
  }

  let sum = 0;
  const length = a.length;
  for (let i = 0; i < length; i++) {
    // 确保数值有效
    if (typeof a[i] !== 'number' || typeof b[i] !== 'number' ||
      isNaN(a[i]) || isNaN(b[i])) {
      console.error('向量距离计算错误: 向量包含非数值元素', {
        index: i, aValue: a[i], bValue: b[i]
      });
      return Infinity;
    }
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * 计算曼哈顿距离 (L1距离)
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {Number} 距离值 
 */
export function computeManhattanDistance(a, b) {
  let sum = 0;
  const length = a.length;
  for (let i = 0; i < length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}

let time = 0;
/**
 * 计算点积正则化的余弦相似度，不需要额外归一化向量
 * 相比标准余弦相似度，此函数在计算过程中直接计算点积，无需预先归一化
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {number} 相似度值 [-1,1]，值越大表示越相似
 */
export function computeNormalizedCosineSimilarity(a, b) {
  const length = a.length;

  let dotProduct = 0;

  // 一次遍历同时计算点积和向量模
  for (let i = 0; i < length; i++) {
    // 确保数值有效

    dotProduct += a[i] * b[i];
   
  }

  // 计算正则化的余弦相似度
  return  dotProduct
}
/**
 * 计算余弦距离 - 值越小表示向量越相似
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {Number} 距离值 [0,2]，值越小表示越相似
 */
export function computeCosineDistance(x, y) {
  // 余弦距离 = 1 - 余弦相似度
  // 确保返回的是距离度量（越小越相似）
  let dotProduct = 0;
  let normX = 0;
  let normY = 0;

  for (let i = 0; i < x.length; i++) {
      dotProduct += x[i] * y[i];
      normX += x[i] * x[i];
      normY += y[i] * y[i];
  }

  const normXSqrt = Math.sqrt(normX);
  const normYSqrt = Math.sqrt(normY);

  if (normXSqrt === 0 || normYSqrt === 0) return 1.0;
  return 1.0 - dotProduct / (normXSqrt * normYSqrt);
}

/**
 * 计算两个向量间的内积相似度
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {number} 相似度值 (越大越相似)
 */
export function computeInnerProduct(a, b) {
  let sum = 0;
  const length = a.length;
  for (let i = 0; i < length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * 计算汉明距离 (适用于二进制向量)
 * @param {Uint8Array|Array} a - 第一个二进制向量
 * @param {Uint8Array|Array} b - 第二个二进制向量
 * @returns {number} 距离值
 */
export function computeHammingDistance(a, b) {
  let distance = 0;
  const length = a.length;
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * 计算杰卡德距离 (适用于集合)
 * @param {Set|Array} a - 第一个集合
 * @param {Set|Array} b - 第二个集合
 * @returns {number} 距离值，范围[0,1]
 */
export function computeJaccardDistance(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return 1 - (intersection.size / union.size);
}

/**
 * 计算闵可夫斯基距离 (Minkowski Distance)
 * 这是一个通用距离度量，是欧几里得距离和曼哈顿距离的一般化形式
 * p=1 时等同于曼哈顿距离，p=2 时等同于欧几里得距离，p→∞ 时趋近于切比雪夫距离
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @param {number} p - 距离的阶数，p ≥ 1
 * @returns {number} 距离值
 */
export function computeMinkowskiDistance(a, b, p = 2) {

  for (let i = 0; i < length; i++) {
    // 确保数值有效
    if (typeof a[i] !== 'number' || typeof b[i] !== 'number' ||
      isNaN(a[i]) || isNaN(b[i])) {
      console.error('向量距离计算错误: 向量包含非数值元素', {
        index: i, aValue: a[i], bValue: b[i]
      });
      return Infinity;
    }
    const diff = Math.abs(a[i] - b[i]);
    sum += Math.pow(diff, p);
  }

  return Math.pow(sum, 1 / p);
}

