
/**
 * 用于校验数据集文件夹名称中非法字符的正则表达式
 * @type {RegExp}
 * @description 匹配以下非法字符：/ \ : ? % * " | < > 空格
 */
const 数据集文件夹名非法字符校验正则 = /[\/\\:?%*"|<> ]+/g;

/**
 * 生成字符串的32位整数哈希值
 * @param {string} str - 需要计算哈希值的输入字符串
 * @returns {number} 32位整数哈希值
 * @description 使用简单的哈希算法生成32位整数哈希值
 */
function simpleHashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const character = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + character;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * 将原始名称转换为合法的文件夹名称
 * @param {string} 原始名称 - 需要转换的原始文件夹名称
 * @returns {string} 合法的文件夹名称，包含可读部分和哈希码
 * @description 该函数会执行以下操作：
 * 1. 检查名称是否包含非法字符
 * 2. 移除非法字符并用下划线替换
 * 3. 移除连续的下划线
 * 4. 移除首尾的下划线
 * 5. 生成哈希码并附加到名称末尾
 * 6. 确保最终名称长度合理
 */
export function 迁移为合法文件夹名称(原始名称) {
    if (!数据集文件夹名非法字符校验正则.test(原始名称)) {
        return 原始名称
    }
    // 移除不允许的字符并替换为下划线
    const 清理后的名称 = 原始名称.replace(数据集文件夹名非法字符校验正则, '_');
    // 移除连续的下划线
    const 无连续下划线的名称 = 清理后的名称.replace(/_+/g, '_');
    // 移除首尾的下划线
    const 去首尾下划线的名称 = 无连续下划线的名称.replace(/^_+|_+$/g, '');
    // 生成哈希码
    const 哈希码 = simpleHashCode(原始名称).toString(16);
    // 对可读部分进行截断以确保名称不会过长
    const 可读部分 = 去首尾下划线的名称.length > 64
        ? 去首尾下划线的名称.substring(0, 64) : 去首尾下划线的名称;
    // 将哈希码附加到文件夹名称
    const 最终名称 = `${可读部分}_${哈希码}`;
    return 最终名称;
}

/**
 * 将路径中的正斜杠替换为反斜杠
 * @param {string} path - 需要修正的路径字符串
 * @returns {string} 修正后的路径字符串
 * @description 主要用于Windows系统路径标准化
 */
export function 修正路径分隔符号为反斜杠(path) {
    // 使用正则表达式替换所有正斜杠为反斜杠
    return path.replace(/\//g, '\\');
}

/**
 * 将路径中的反斜杠替换为正斜杠
 * @param {string} path - 需要修正的路径字符串
 * @returns {string} 修正后的路径字符串
 * @description 主要用于跨平台路径标准化
 */
export function 修正路径分隔符号为正斜杠(path) {
    // 使用正则表达式替换所有反斜杠为正斜杠
    return path.replace(/\\/g, '/');
}