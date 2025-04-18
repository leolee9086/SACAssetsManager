/**
 * @fileoverview 正则表达式复杂度计算工具
 * @module toolBox/base/useEcma/forString/forRegexComplexity
 */

/**
 * 简单计算正则表达式的复杂度
 * 用以在各种情况下排序列表
 * @param {string} regexString - 要计算复杂度的正则表达式字符串
 * @returns {object} 包含各项复杂性指标和总得分的对象
 * @property {number} totalLength - 字符串总长度
 * @property {number} specialChars - 特殊字符数量
 * @property {number} quantifiers - 量词数量
 * @property {number} groups - 捕获分组数量
 * @property {number} alternations - 或选择符数量
 * @property {number} lookarounds - 零宽断言数量 (此实现可能不准确)
 * @property {number} flags - 是否包含修饰符
 * @property {number} namedGroups - 命名分组数量
 * @property {number} comments - 注释数量 (此实现可能不准确)
 * @property {number} nestedDepth - 最大嵌套深度
 * @property {number} complexityScore - 综合复杂度得分
 */
export function measureRegexComplexity(regexString) {
    // 注意：此实现可能无法准确处理所有复杂的正则表达式边缘情况。
    const regex = new RegExp('^' + regexString + '$'); // 用于检查修饰符
    const complexity = {
        totalLength: regexString.length,
        specialChars: (regexString.match(/[\(\)\[\]\{\}\^\$\.\?\*\+\-\|]/g) || []).length,
        quantifiers: (regexString.match(/(\?|\{[^}]+\})[+*?]?/g) || []).length,
        groups: (regexString.match(/\((?!\?)/g) || []).length, // 排除非捕获组
        alternations: (regexString.match(/\|/g) || []).length,
        // 尝试更准确地匹配常见的lookaround，但仍然不完美
        lookarounds: (regexString.match(/\(\?[=<!]/g) || []).length,
        flags: (regex.flags.length > 0) ? 1 : 0,
        namedGroups: (regexString.match(/\(\?<[^>]+>/g) || []).length,
        comments: (regexString.match(/\(\?#[^)]*\)/g) || []).length, // 匹配 (?#...) 注释
        nestedDepth: 0,
        complexityScore: 0
    };

    // 计算嵌套深度
    let currentDepth = 0;
    for (let i = 0; i < regexString.length; i++) {
        if (regexString[i] === '(' && (i === 0 || regexString[i - 1] !== '\\')) {
            currentDepth++;
            complexity.nestedDepth = Math.max(complexity.nestedDepth, currentDepth);
        } else if (regexString[i] === ')' && (i === 0 || regexString[i - 1] !== '\\') && currentDepth > 0) {
            currentDepth--;
        }
    }

    // 计算复杂度得分 (权重可调整)
    complexity.complexityScore = (
        complexity.totalLength +
        complexity.specialChars * 2 +
        complexity.quantifiers * 3 +
        complexity.groups * 2 +
        complexity.alternations * 2 +
        complexity.lookarounds * 5 +
        complexity.flags +
        complexity.namedGroups * 2 +
        complexity.comments * 1 +
        complexity.nestedDepth * 4
    );

    return complexity;
}

// 提供英文别名
export { measureRegexComplexity as computeRegexComplexity }; 