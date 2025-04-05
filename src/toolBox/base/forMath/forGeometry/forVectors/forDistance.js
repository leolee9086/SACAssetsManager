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
export function computeCosineSimilarity(a, b) {
  // 添加防御性检查
  if (!a || !b) {
    console.error('向量相似度计算错误: 输入向量为空', { a, b });
    return 0; // 返回0表示零相似度
  }
  
  if (a.length !== b.length) {
    console.error('向量相似度计算错误: 向量维度不匹配', { aLength: a.length, bLength: b.length });
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const length = a.length;
  
  for (let i = 0; i < length; i++) {
    // 确保数值有效
    if (typeof a[i] !== 'number' || typeof b[i] !== 'number' || 
        isNaN(a[i]) || isNaN(b[i])) {
      console.error('向量相似度计算错误: 向量包含非数值元素', { 
        index: i, aValue: a[i], bValue: b[i] 
      });
      return 0;
    }
    
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  // 处理零向量情况
  if (normA === 0 || normB === 0) return 0;
  
  // 计算余弦相似度
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 计算余弦距离 - 值越小表示向量越相似
 * @param {Float32Array|Array} a - 第一个向量
 * @param {Float32Array|Array} b - 第二个向量
 * @returns {Number} 距离值 [0,2]，值越小表示越相似
 */
export function computeCosineDistance(a, b) {
  // 余弦距离 = 1 - 余弦相似度
  // 确保返回的是距离度量（越小越相似）
  const similarity = computeCosineSimilarity(a, b);
  return 1 - similarity;
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