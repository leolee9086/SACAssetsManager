/**
 * 安全序列化工具模块
 * 提供高级对象序列化功能
 */

import { serialize } from '../useDeps/fromSerialize.js';

/**
 * 安全序列化对象
 * @param {any} 对象 - 需要序列化的对象
 * @param {number} 缩进 - JSON缩进空格数
 * @param {function} [replacer] - 自定义替换函数
 * @returns {string} 序列化后的字符串
 */
export const 安全序列化 = (对象, 缩进 = 0, replacer) => {
    try {
        return serialize(对象, {
            space: 缩进,
            isJSON: false, // 允许序列化非JSON标准值
            unsafe: true,  // 允许序列化特殊对象如RegExp, Date等
            ignoreFunction: true, // 自动忽略函数
            replacer: replacer
        });
    } catch (e) {
        try {
            return JSON.stringify(对象, replacer, 缩进);
        } catch (jsonError) {
            return `[复杂对象: ${typeof 对象}]`;
        }
    }
};

/**
 * 序列化包含函数的对象
 * @param {any} 对象 - 需要序列化的对象
 * @returns {string} 序列化后的字符串
 */
export const 序列化含函数对象 = (对象) => {
    return serialize(对象, {
        ignoreFunction: false // 包含函数序列化
    });
};

/**
 * 序列化为可执行字符串
 * @param {any} 对象 - 需要序列化的对象
 * @returns {string} 可eval的字符串
 */
export const 序列化为可执行代码 = (对象) => {
    return serialize(对象, {
        isJSON: false,
        unsafe: true
    });
};

/**
 * 深度比较两个对象
 * @param {any} 对象1 - 第一个对象
 * @param {any} 对象2 - 第二个对象
 * @returns {boolean} 是否深度相等
 */
export const 深度比较 = (对象1, 对象2) => {
    return serialize(对象1) === serialize(对象2);
};

/**
 * 生成对象指纹(MD5哈希)
 * @param {any} 对象 - 需要生成指纹的对象
 * @returns {string} 对象指纹
 */
export const 生成对象指纹 = (对象) => {
    const 序列化字符串 = serialize(对象);
    // 这里可以接入实际的MD5库
    return `hash_${序列化字符串.length}_${序列化字符串.substr(0, 10)}...`;
};

