/**
 * 后端事件处理模块
 * 负责处理服务器端的事件触发和监听
 */

import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

/**
 * 事件处理器映射
 * @type {Object}
 */
const 事件处理器 = {};

/**
 * 添加事件监听器
 * @param {string} 事件名称 - 要监听的事件名称
 * @param {Function} 处理函数 - 事件处理函数
 * @param {Object} [选项={}] - 事件选项
 * @param {boolean} [选项.单次=false] - 是否只触发一次
 * @returns {string} 监听器ID
 */
export const 添加事件监听器 = (事件名称, 处理函数, 选项 = {}) => {
    if (!事件名称 || typeof 处理函数 !== 'function') {
        throw new Error('事件名称和处理函数都必须提供');
    }
    
    // 确保该事件的处理器数组存在
    if (!事件处理器[事件名称]) {
        事件处理器[事件名称] = [];
    }
    
    // 生成唯一ID
    const 监听器ID = `${事件名称}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 添加处理器
    事件处理器[事件名称].push({
        id: 监听器ID,
        处理函数,
        单次: 选项.单次 === true
    });
    
    日志.调试(`添加事件监听器: ${事件名称}, ID: ${监听器ID}`, 'Event');
    
    return 监听器ID;
};

/**
 * 移除事件监听器
 * @param {string} 事件名称 - 事件名称
 * @param {string|Function} 标识符 - 监听器ID或处理函数
 * @returns {boolean} 是否成功移除
 */
export const 移除事件监听器 = (事件名称, 标识符) => {
    if (!事件名称 || !标识符 || !事件处理器[事件名称]) {
        return false;
    }
    
    const 原始长度 = 事件处理器[事件名称].length;
    
    if (typeof 标识符 === 'string') {
        // 通过ID移除
        事件处理器[事件名称] = 事件处理器[事件名称].filter(处理器 => 处理器.id !== 标识符);
    } else if (typeof 标识符 === 'function') {
        // 通过函数引用移除
        事件处理器[事件名称] = 事件处理器[事件名称].filter(处理器 => 处理器.处理函数 !== 标识符);
    }
    
    const 移除成功 = 事件处理器[事件名称].length < 原始长度;
    
    if (移除成功) {
        日志.调试(`移除事件监听器: ${事件名称}`, 'Event');
    }
    
    return 移除成功;
};

/**
 * 触发事件
 * @param {string} 事件名称 - 要触发的事件名称
 * @param {*} 数据 - 事件数据
 * @returns {Promise<Array>} 所有处理器的处理结果
 */
export const 触发事件 = async (事件名称, 数据) => {
    if (!事件名称 || !事件处理器[事件名称]) {
        return [];
    }
    
    日志.调试(`触发事件: ${事件名称}`, 'Event');
    
    const 待移除 = [];
    const 处理结果 = [];
    
    // 执行所有处理器
    for (const 处理器 of 事件处理器[事件名称]) {
        try {
            const 结果 = await Promise.resolve(处理器.处理函数(数据));
            处理结果.push(结果);
            
            // 如果是单次处理器，标记为待移除
            if (处理器.单次) {
                待移除.push(处理器.id);
            }
        } catch (错误) {
            日志.错误(`事件处理器出错: ${错误.message}`, 'Event');
            处理结果.push(null);
        }
    }
    
    // 移除单次处理器
    待移除.forEach(id => {
        事件处理器[事件名称] = 事件处理器[事件名称].filter(处理器 => 处理器.id !== id);
    });
    
    return 处理结果;
};

/**
 * 获取事件监听器数量
 * @param {string} [事件名称] - 事件名称，不提供则返回所有事件的监听器总数
 * @returns {number} 监听器数量
 */
export const 获取监听器数量 = (事件名称) => {
    if (事件名称) {
        return 事件处理器[事件名称]?.length || 0;
    }
    
    // 计算所有事件的监听器总数
    return Object.values(事件处理器).reduce((总数, 处理器数组) => 总数 + 处理器数组.length, 0);
};

/**
 * 清除所有事件监听器
 * @param {string} [事件名称] - 事件名称，不提供则清除所有事件的监听器
 */
export const 清除事件监听器 = (事件名称) => {
    if (事件名称) {
        事件处理器[事件名称] = [];
        日志.调试(`清除事件 ${事件名称} 的所有监听器`, 'Event');
    } else {
        Object.keys(事件处理器).forEach(名称 => {
            事件处理器[名称] = [];
        });
        日志.调试('清除所有事件监听器', 'Event');
    }
}; 