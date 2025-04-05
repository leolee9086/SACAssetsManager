/**
 * 向量归一化函数集合
 * 提供向量标准化的各种计算方法
 */

/**
 * 向量归一化 (支持任意维度)
 * @param {Array|Float32Array} vector - 输入向量 [x, y, ...] 
 * @returns {Array|Float32Array} 归一化后的单位向量
 */
export function computeVectorNormalization(vector) {
    // 计算向量长度
    const length = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (length === 0) return vector.map(() => 0); // 零向量返回同维度的零向量
    // 返回归一化结果
    return vector.map(val => val / length);
}