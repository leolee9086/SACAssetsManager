/**
 * 向量空间相似度计算工具
 * 提供各种向量相似度度量方法
 */

/**
 * 计算已归一化向量的余弦相似度（点积）
 * 此方法针对已归一化的向量优化，计算速度更快
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @returns {number} 两个向量的余弦相似度，范围在[-1, 1]之间
 * 
 * @example
 * const vec1 = [0.1, 0.2, 0.3].map(v => v / Math.sqrt(0.1*0.1 + 0.2*0.2 + 0.3*0.3));
 * const vec2 = [0.2, 0.3, 0.4].map(v => v / Math.sqrt(0.2*0.2 + 0.3*0.3 + 0.4*0.4));
 * const similarity = 计算归一化向量余弦相似度(vec1, vec2);
 */
export function 计算归一化向量余弦相似度(vector1, vector2) {
    // 假设这些向量已经全部正规化了
    let dotProduct = 0;
    const length = Math.min(vector1.length, vector2.length);
    
    for (let i = 0; i < length; i++) {
        dotProduct += (vector1[i] || 0) * (vector2[i] || 0);
    }
    
    return dotProduct;
}

/**
 * 计算向量的余弦相似度
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @returns {number} 两个向量的余弦相似度，范围在[-1, 1]之间
 * 
 * @example
 * const similarity = 计算余弦相似度([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);
 */
export function 计算余弦相似度(vector1, vector2) {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    const length = Math.min(vector1.length, vector2.length);
    
    for (let i = 0; i < length; i++) {
        const val1 = vector1[i] || 0;
        const val2 = vector2[i] || 0;
        dotProduct += val1 * val2;
        magnitude1 += val1 * val1;
        magnitude2 += val2 * val2;
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0; // 避免除以零
    }
    
    return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 计算向量的欧氏距离
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @returns {number} 两个向量的欧氏距离
 * 
 * @example
 * const distance = 计算欧氏距离([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);
 */
export function 计算欧氏距离(vector1, vector2) {
    let sum = 0;
    const length = Math.min(vector1.length, vector2.length);
    
    for (let i = 0; i < length; i++) {
        const val1 = vector1[i] || 0;
        const val2 = vector2[i] || 0;
        sum += Math.pow(val1 - val2, 2);
    }
    
    return Math.sqrt(sum);
}

/**
 * 计算向量的欧氏距离相似度（用于相似度搜索）
 * 将欧氏距离转换为相似度度量（值越大表示越相似）
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @returns {number} 基于欧氏距离的相似度
 * 
 * @example
 * const similarity = 计算欧氏距离相似度([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);
 */
export function 计算欧氏距离相似度(vector1, vector2) {
    return 计算欧氏距离(vector1, vector2);
}

/**
 * 计算向量的曼哈顿距离（L1范数）
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @returns {number} 两个向量的曼哈顿距离
 * 
 * @example
 * const distance = 计算曼哈顿距离([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);
 */
export function 计算曼哈顿距离(vector1, vector2) {
    let sum = 0;
    const length = Math.min(vector1.length, vector2.length);
    
    for (let i = 0; i < length; i++) {
        const val1 = vector1[i] || 0;
        const val2 = vector2[i] || 0;
        sum += Math.abs(val1 - val2);
    }
    
    return sum;
}

/**
 * 计算两个向量的点积
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @returns {number} 两个向量的点积
 * 
 * @example
 * const dotProduct = 计算点积([0.1, 0.2, 0.3], [0.2, 0.3, 0.4]);
 */
export function 计算点积(vector1, vector2) {
    let dotProduct = 0;
    const length = Math.min(vector1.length, vector2.length);
    
    for (let i = 0; i < length; i++) {
        dotProduct += (vector1[i] || 0) * (vector2[i] || 0);
    }
    
    return dotProduct;
}

/**
 * 计算加权余弦相似度
 * 
 * @param {Array|Float32Array} vector1 - 第一个向量
 * @param {Array|Float32Array} vector2 - 第二个向量
 * @param {Array|Float32Array} weights - 每个维度的权重
 * @returns {number} 加权余弦相似度
 * 
 * @example
 * const similarity = 计算加权余弦相似度(
 *   [0.1, 0.2, 0.3], 
 *   [0.2, 0.3, 0.4], 
 *   [1.0, 2.0, 0.5]
 * );
 */
export function 计算加权余弦相似度(vector1, vector2, weights) {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    const length = Math.min(vector1.length, vector2.length, weights.length);
    
    for (let i = 0; i < length; i++) {
        const val1 = vector1[i] || 0;
        const val2 = vector2[i] || 0;
        const weight = weights[i] || 1;
        
        dotProduct += val1 * val2 * weight;
        magnitude1 += val1 * val1 * weight;
        magnitude2 += val2 * val2 * weight;
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0; // 避免除以零
    }
    
    return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 计算Jaccard相似度（集合相似度）
 * 
 * @param {Set|Array} set1 - 第一个集合或数组
 * @param {Set|Array} set2 - 第二个集合或数组
 * @returns {number} Jaccard相似度，范围在[0, 1]之间
 * 
 * @example
 * const similarity = 计算Jaccard相似度([1, 2, 3, 4], [2, 3, 4, 5]);
 */
export function 计算Jaccard相似度(set1, set2) {
    // 转换输入为Set类型
    const s1 = new Set(set1);
    const s2 = new Set(set2);
    
    // 计算交集大小
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    
    // 计算并集大小
    const union = new Set([...s1, ...s2]);
    
    // 避免除以零
    if (union.size === 0) return 1.0;
    
    // 返回Jaccard相似度
    return intersection.size / union.size;
}

// 导出英文别名
export const calculateNormalizedCosineSimilarity = 计算归一化向量余弦相似度;
export const calculateCosineSimilarity = 计算余弦相似度;
export const calculateEuclideanDistance = 计算欧氏距离;
export const calculateEuclideanSimilarity = 计算欧氏距离相似度;
export const calculateManhattanDistance = 计算曼哈顿距离;
export const calculateDotProduct = 计算点积;
export const calculateWeightedCosineSimilarity = 计算加权余弦相似度;
export const calculateJaccardSimilarity = 计算Jaccard相似度; 