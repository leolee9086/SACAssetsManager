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
  let sum = 0;
  const length = a.length;
  for (let i = 0; i < length; i++) {
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

/**
 * 计算切比雪夫距离 (L∞距离)
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {Number} 距离值
 */
export function computeChebyshevDistance(a, b) {
  let max = 0;
  const length = a.length;
  for (let i = 0; i < length; i++) {
    const diff = Math.abs(a[i] - b[i]);
    if (diff > max) max = diff;
  }
  return max;
}

/**
 * 计算余弦相似度
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {Number} 相似度值 [-1,1]，值越大表示越相似
 */
export function computeCosineDistance(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const length = a.length;
  
  for (let i = 0; i < length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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