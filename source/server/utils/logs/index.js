/**
 * 日志系统
 * 提供高性能的日志记录、存储和展示系统
 */

import * as 数据库 from './logDB.js';
import * as 格式化器 from './logFormatter.js';
import * as 处理器 from './logProcessor.js';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

// 状态标记
let 已初始化 = false;

/**
 * 初始化日志系统
 * @returns {Promise} 初始化完成的Promise
 */
export const 初始化日志系统 = async () => {
    if (已初始化) return;
    
    try {
        await 数据库.初始化数据库();
        已初始化 = true;
        return true;
    } catch (错误) {
        console.error('初始化日志系统失败:', 错误);
        return false;
    }
};

/**
 * 创建日志批处理器
 * @param {Function} 保存函数 - 日志保存处理函数
 * @param {Object} 配置 - 批处理器配置
 * @returns {Object} 日志批处理器实例
 */
export const 创建日志批处理器 = (保存函数, 配置 = {}) => {
    return new 处理器.日志批处理器(保存函数, 配置);
};

/**
 * 创建节流发送函数
 * @param {Function} 发送函数 - 日志发送函数
 * @param {Number} 延迟 - 节流延迟时间（毫秒）
 * @returns {Function} 节流后的发送函数
 */
export const 创建节流发送函数 = (发送函数, 延迟 = 50) => {
    return 处理器.创建节流函数(发送函数, 延迟);
};

// 导出所有模块
export {
    数据库,
    格式化器,
    处理器,
    日志
}; 