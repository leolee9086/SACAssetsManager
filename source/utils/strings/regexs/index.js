/**
 * 简单计算正则表达式的复杂度
 * 用以在各种情况下排序列表
 * @param {*} regexString 
 * @returns 
 */
export function measureRegexComplexity(regexString) {
    const regex = new RegExp('^' + regexString + '$');
    const complexity = {
        totalLength: regexString.length,
        specialChars: (regexString.match(/[\(\)\[\]\{\}\^\$\.\?\*\+\-\|]/g) || []).length,
        quantifiers: (regexString.match(/(\?|\{[^}]+\})[+*?]?/g) || []).length,
        groups: (regexString.match(/\((?!\?)/g) || []).length,
        alternations: (regexString.match(/\|/g) || []).length,
        lookarounds: (regexString.match(/(?<=\()(?:\\[1-9]+\|\\b|\\B)/g) || []).length,
        flags: (regex.flags.length > 0) ? 1 : 0,
        namedGroups: (regexString.match(/(?<=\()\?<[^>]+>/g) || []).length,
        comments: (regexString.match(/(?<=\()\?#[^*]*\*\//g) || []).length,
        nestedDepth: 0,
        complexityScore: 0
    };

    // 计算嵌套深度
    let stack = [];
    for (let i = 0; i < regexString.length; i++) {
        if (regexString[i] === '(') {
            stack.push(i);
        } else if (regexString[i] === ')' && stack.length > 0) {
            complexity.nestedDepth = Math.max(complexity.nestedDepth, stack.length);
            stack.pop();
        }
    }

    // 计算复杂度得分
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