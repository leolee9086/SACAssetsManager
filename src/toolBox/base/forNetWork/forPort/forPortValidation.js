/**
 * @fileoverview 端口验证工具函数
 */

/**
 * 校验端口号格式
 * @param {number} 端口号 - 需要验证的端口号
 * @throws {Error} 当端口号无效时抛出错误
 */
export const 校验端口号格式 = (端口号) => {
    // 检查端口号的类型
    if (typeof 端口号 !== 'number') {
        throw new Error('端口号必须是一个数字');
    }
    // 检查端口号的范围
    if (端口号 < 0 || 端口号 > 65535) {
        throw new Error('端口号必须在0到65535之间');
    }
}; 