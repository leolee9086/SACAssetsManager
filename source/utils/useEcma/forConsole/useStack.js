/**
 * useStack.js - 用于获取函数调用位置的工具模块
 */

/**
 * 获取当前调用的位置信息
 * @param {number} stackIndex 堆栈中的位置索引，默认为2（调用者的调用者）
 * @returns {string} 格式化的调用位置信息
 */
export function getCallerLocation(stackIndex = 2) {
    // 获取调用堆栈
    const stack = new Error().stack;
    // 解析调用位置
    const stackLines = stack.split('\n');
    let callerInfo = '未知位置';
    
    // 确保堆栈中有足够的行
    if (stackLines.length > stackIndex) {
        // 提取调用位置信息
        const callerLine = stackLines[stackIndex].trim();
        // 提取文件路径和行号
        const matches = callerLine.match(/at\s+(.+?)(?:\s+\((.+?):(\d+):(\d+)\)|:(\d+):(\d+))/);
        if (matches) {
            const file = matches[2] || callerLine.split(':')[0].replace('at ', '');
            const line = matches[3] || matches[5];
            const column = matches[4] || matches[6];
            callerInfo = `${file}:${line}:${column}`;
        }
    }
    
    return callerInfo;
}

/**
 * 给函数添加调用位置跟踪能力
 * @param {Function} originalFn 原始函数
 * @param {Function} wrapperFn 用于处理调用位置和原始函数的包装器
 * @returns {Function} 增强后的函数
 */
export function addStackTrace(originalFn, wrapperFn) {
    return function(...args) {
        const callerLocation = getCallerLocation(3); // 增加堆栈深度以获取实际调用者
        return wrapperFn.call(this, originalFn, callerLocation, ...args);
    };
}
