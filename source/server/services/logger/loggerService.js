/**
 * 日志服务
 * 提供统一的日志记录和管理功能
 */

import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import * as 数据库 from '../../utils/logs/logDB.js';
import * as 格式化器 from '../../../../src/toolBox/base/useEcma/forLogs/useLogFormatter.js';
import * as 处理器 from '../../utils/logs/logProcessor.js';

// 状态标记
let 已初始化 = false;

/**
 * 初始化日志系统
 * @returns {Promise<boolean>} 初始化是否成功
 */
export const 初始化日志系统 = async () => {
    if (已初始化) return true;
    
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
 * 记录信息日志
 * @param {string|Object} 消息 - 日志消息
 * @param {string} [标签='默认'] - 日志标签
 */
export const 记录信息 = (消息, 标签 = '默认') => {
    日志.信息(消息, 标签);
};

/**
 * 记录警告日志
 * @param {string|Object} 消息 - 日志消息
 * @param {string} [标签='默认'] - 日志标签
 */
export const 记录警告 = (消息, 标签 = '默认') => {
    日志.警告(消息, 标签);
};

/**
 * 记录错误日志
 * @param {string|Object} 消息 - 日志消息
 * @param {string} [标签='默认'] - 日志标签
 */
export const 记录错误 = (消息, 标签 = '默认') => {
    日志.错误(消息, 标签);
};

/**
 * 记录调试日志
 * @param {string|Object} 消息 - 日志消息
 * @param {string} [标签='默认'] - 日志标签
 */
export const 记录调试 = (消息, 标签 = '默认') => {
    日志.调试(消息, 标签);
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
 * 创建节流日志函数
 * @param {Function} 日志函数 - 原始日志函数
 * @param {Number} 延迟 - 节流延迟（毫秒）
 * @returns {Function} 节流后的日志函数
 */
export const 创建节流日志函数 = (日志函数, 延迟 = 50) => {
    return 处理器.创建节流函数(日志函数, 延迟);
};

/**
 * 格式化日志
 * @param {string} 级别 - 日志级别
 * @param {Array} 参数 - 日志参数
 * @param {string} 来源 - 日志来源
 * @returns {Object} 格式化后的日志对象
 */
export const 格式化日志 = (级别, 参数, 来源) => {
    return 格式化器.格式化日志(级别, 参数, 来源);
};

/**
 * 查询日志
 * @param {Object} 查询条件 - 查询条件对象
 * @param {Object} 选项 - 查询选项
 * @returns {Promise<Array>} 日志记录数组
 */
export const 查询日志 = async (查询条件 = {}, 选项 = {}) => {
    return await 数据库.查询日志(查询条件, 选项);
};

/**
 * 清理过期日志
 * @param {Number} 天数 - 保留的天数
 * @returns {Promise<Number>} 清理的日志条数
 */
export const 清理过期日志 = async (天数 = 30) => {
    const 过期时间 = new Date();
    过期时间.setDate(过期时间.getDate() - 天数);
    
    return await 数据库.删除过期日志(过期时间);
}; 