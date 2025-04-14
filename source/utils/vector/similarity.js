/**
 * @deprecated 此模块已迁移至 src/toolBox/feature/forVectorEmbedding/
 * 请使用新模块中的函数以获得更完整的功能
 */

// 导入新的实现
import { 
    计算归一化向量余弦相似度 as 新_计算归一化向量余弦相似度,
    计算余弦相似度 as 新_计算余弦相似度,
    计算欧氏距离 as 新_计算欧氏距离,
    计算欧氏距离相似度 as 新_计算欧氏距离相似度
} from '../../../src/toolBox/feature/forVectorEmbedding/vectorSimilarity.js';

import {
    计算Levenshtein距离 as 新_计算Levenshtein距离
} from '../../../src/toolBox/feature/forVectorEmbedding/stringSimilarity.js';

// 记录废弃警告
console.warn('source/utils/vector/similarity.js 已废弃，请使用 src/toolBox/feature/forVectorEmbedding/ 下的相关模块');

// 重新导出函数，保持原有API
export const 计算归一化向量余弦相似度 = (vector1, vector2) => {
    return 新_计算归一化向量余弦相似度(vector1, vector2);
}

export const 计算余弦相似度 = (vector1, vector2) => {
    return 新_计算余弦相似度(vector1, vector2);
}

export const 计算欧氏距离相似度 = (vector1, vector2) => {
    return 新_计算欧氏距离相似度(vector1, vector2);
};

export const 计算Levenshtein距离 = (a, b) => {
    return 新_计算Levenshtein距离(a, b);
}