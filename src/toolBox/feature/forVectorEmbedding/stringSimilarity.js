/**
 * 字符串相似度计算工具
 * 提供各种字符串相似度度量方法
 */

/**
 * 计算两个字符串的Levenshtein距离（编辑距离）
 * 
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @returns {number} 两个字符串的编辑距离
 * 
 * @example
 * const distance = 计算Levenshtein距离("kitten", "sitting");
 */
export function 计算Levenshtein距离(a, b) {
    const m = a.length;
    const n = b.length;
    
    // 边界情况处理
    if (m === 0) return n;
    if (n === 0) return m;
    
    // 创建二维数组来存储计算过程中的中间结果
    const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0));
    
    // 初始化第一行和第一列
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }
    
    // 计算Levenshtein距离
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1, // 替换
                    dp[i][j - 1] + 1,     // 插入
                    dp[i - 1][j] + 1      // 删除
                );
            }
        }
    }
    
    return dp[m][n];
}

/**
 * 计算基于Levenshtein距离的相似度（0到1之间，1表示完全相同）
 * 
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串 
 * @returns {number} 相似度得分，范围在[0, 1]之间
 * 
 * @example
 * const similarity = 计算Levenshtein相似度("kitten", "sitting");
 */
export function 计算Levenshtein相似度(a, b) {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    
    const maxLength = Math.max(a.length, b.length);
    const distance = 计算Levenshtein距离(a, b);
    
    return 1 - (distance / maxLength);
}

/**
 * 计算两个字符串的Jaro-Winkler距离
 * 特别适合短字符串和人名比较
 * 
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @returns {number} Jaro-Winkler相似度，范围在[0, 1]之间
 * 
 * @example
 * const similarity = 计算JaroWinkler相似度("MARTHA", "MARHTA");
 */
export function 计算JaroWinkler相似度(a, b) {
    // 如果两个字符串相同，直接返回1.0
    if (a === b) return 1.0;
    
    // 如果有一个字符串为空，直接返回0.0
    if (a.length === 0 || b.length === 0) return 0.0;
    
    // 计算匹配窗口大小
    const matchDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    
    // 初始化匹配标记数组
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);
    
    // 计算匹配的字符数
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
        // 计算匹配窗口的起始和结束位置
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, b.length);
        
        for (let j = start; j < end; j++) {
            // 如果字符匹配且尚未被标记为匹配
            if (!bMatches[j] && a[i] === b[j]) {
                aMatches[i] = true;
                bMatches[j] = true;
                matches++;
                break;
            }
        }
    }
    
    // 如果没有匹配的字符，返回0.0
    if (matches === 0) return 0.0;
    
    // 计算转置的数量
    let transpositions = 0;
    let k = 0;
    
    for (let i = 0; i < a.length; i++) {
        if (aMatches[i]) {
            while (!bMatches[k]) k++;
            
            if (a[i] !== b[k]) transpositions++;
            k++;
        }
    }
    
    // 计算Jaro距离
    const m = matches;
    const t = transpositions / 2;
    const jaro = (m / a.length + m / b.length + (m - t) / m) / 3;
    
    // 计算公共前缀长度（最大为4）
    let prefixLength = 0;
    for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
        if (a[i] === b[i]) {
            prefixLength++;
        } else {
            break;
        }
    }
    
    // 计算Jaro-Winkler距离（添加前缀调整）
    const scalingFactor = 0.1; // Winkler比例因子，通常为0.1
    return jaro + (prefixLength * scalingFactor * (1 - jaro));
}

/**
 * 计算最长公共子序列(LCS)的长度
 * 子序列不要求连续，但要求相对顺序不变
 * 
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @returns {number} 最长公共子序列的长度
 * 
 * @example
 * const lcsLength = 计算最长公共子序列长度("ABCDEF", "ACBEF");
 */
export function 计算最长公共子序列长度(a, b) {
    const m = a.length;
    const n = b.length;
    
    // 创建二维数组来存储中间结果
    const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0));
    
    // 填充DP表
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

/**
 * 基于最长公共子序列的相似度（0到1之间，1表示完全相同）
 * 
 * @param {string} a - 第一个字符串
 * @param {string} b - 第二个字符串
 * @returns {number} 相似度得分，范围在[0, 1]之间
 * 
 * @example
 * const similarity = 计算LCS相似度("ABCDEF", "ACBEF");
 */
export function 计算LCS相似度(a, b) {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    
    const lcsLength = 计算最长公共子序列长度(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    return lcsLength / maxLength;
}

// 导出英文别名
export const calculateLevenshteinDistance = 计算Levenshtein距离;
export const calculateLevenshteinSimilarity = 计算Levenshtein相似度;
export const calculateJaroWinklerSimilarity = 计算JaroWinkler相似度;
export const calculateLCSLength = 计算最长公共子序列长度;
export const calculateLCSSimilarity = 计算LCS相似度; 