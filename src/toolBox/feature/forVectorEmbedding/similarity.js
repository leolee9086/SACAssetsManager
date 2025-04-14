/**
 * 向量相似度计算工具集
 * 集成所有相似度算法的入口文件
 */

// 导入向量空间相似度
import {
    计算归一化向量余弦相似度,
    计算余弦相似度,
    计算欧氏距离,
    计算欧氏距离相似度,
    计算曼哈顿距离,
    计算点积,
    计算加权余弦相似度,
    计算Jaccard相似度,
    // 英文别名
    calculateNormalizedCosineSimilarity,
    calculateCosineSimilarity,
    calculateEuclideanDistance,
    calculateEuclideanSimilarity,
    calculateManhattanDistance,
    calculateDotProduct,
    calculateWeightedCosineSimilarity,
    calculateJaccardSimilarity
} from './vectorSimilarity.js';

// 导入字符串相似度
import {
    计算Levenshtein距离,
    计算Levenshtein相似度,
    计算JaroWinkler相似度,
    计算最长公共子序列长度,
    计算LCS相似度,
    // 英文别名
    calculateLevenshteinDistance,
    calculateLevenshteinSimilarity,
    calculateJaroWinklerSimilarity,
    calculateLCSLength,
    calculateLCSSimilarity
} from './stringSimilarity.js';

/**
 * 根据向量类型自动选择合适的相似度算法
 * 
 * @param {Array|string} a - 第一个向量或字符串
 * @param {Array|string} b - 第二个向量或字符串
 * @param {Object} options - 配置选项
 * @param {string} options.type - 相似度类型: 'auto', 'cosine', 'euclidean', 'levenshtein', 'jaro', 'lcs'
 * @returns {number} 相似度值
 * 
 * @example
 * const similarity = 智能计算相似度([1,2,3], [2,3,4]);
 * const similarity = 智能计算相似度('hello', 'hallo', { type: 'levenshtein' });
 */
export function 智能计算相似度(a, b, options = {}) {
    const { type = 'auto' } = options;
    
    // 自动判断类型
    if (type === 'auto') {
        // 如果是字符串类型
        if (typeof a === 'string' && typeof b === 'string') {
            // 对于短字符串，使用JaroWinkler
            if (a.length < 10 && b.length < 10) {
                return 计算JaroWinkler相似度(a, b);
            }
            // 否则使用Levenshtein
            return 计算Levenshtein相似度(a, b);
        }
        
        // 处理向量
        if (Array.isArray(a) && Array.isArray(b)) {
            // 默认使用余弦相似度
            return 计算余弦相似度(a, b);
        }
        
        // 不支持的类型
        throw new Error('不支持的数据类型组合，请提供字符串或向量');
    }
    
    // 根据指定类型选择算法
    switch (type) {
        case 'cosine':
            return 计算余弦相似度(a, b);
            
        case 'euclidean':
            return 计算欧氏距离相似度(a, b);
            
        case 'manhattan':
            return 计算曼哈顿距离(a, b);
            
        case 'dot':
            return 计算点积(a, b);
            
        case 'jaccard':
            return 计算Jaccard相似度(a, b);
            
        case 'levenshtein':
            return 计算Levenshtein相似度(a, b);
            
        case 'jaro':
        case 'jarowinkler':
            return 计算JaroWinkler相似度(a, b);
            
        case 'lcs':
            return 计算LCS相似度(a, b);
            
        default:
            throw new Error(`未知的相似度类型: ${type}`);
    }
}

// 导出所有函数
export {
    // 向量空间相似度
    计算归一化向量余弦相似度,
    计算余弦相似度,
    计算欧氏距离,
    计算欧氏距离相似度,
    计算曼哈顿距离,
    计算点积,
    计算加权余弦相似度,
    计算Jaccard相似度,
    
    // 字符串相似度
    计算Levenshtein距离,
    计算Levenshtein相似度,
    计算JaroWinkler相似度,
    计算最长公共子序列长度,
    计算LCS相似度,
    
    // 英文别名
    calculateNormalizedCosineSimilarity,
    calculateCosineSimilarity,
    calculateEuclideanDistance,
    calculateEuclideanSimilarity,
    calculateManhattanDistance,
    calculateDotProduct,
    calculateWeightedCosineSimilarity,
    calculateJaccardSimilarity,
    calculateLevenshteinDistance,
    calculateLevenshteinSimilarity,
    calculateJaroWinklerSimilarity,
    calculateLCSLength,
    calculateLCSSimilarity
};

// 导出英文别名
export const intelligentSimilarity = 智能计算相似度; 