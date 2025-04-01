/**
 * 日志系统
 * 提供高性能的日志记录、存储和展示系统
 */

// 导入重构后的日志工具模块
import * as 数据库模块 from '../../../../src/toolBox/base/useEcma/forLogs/useLogDatabase.js';
import * as 格式化器模块 from '../../../../src/toolBox/base/useEcma/forLogs/useLogFormatter.js';
import * as 处理器模块 from '../../../../src/toolBox/base/useEcma/forLogs/useLogProcessor.js';
import { 日志 as 日志模块 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

// 状态标记
let 已初始化 = false;

/**
 * 初始化日志系统
 * @returns {Promise} 初始化完成的Promise
 */
export const 初始化日志系统 = async () => {
    if (已初始化) return;
    
    try {
        await 数据库模块.初始化数据库();
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
    return 处理器模块.创建日志批处理器(保存函数, 配置);
};

/**
 * 创建节流发送函数
 * @param {Function} 发送函数 - 日志发送函数
 * @param {Number} 延迟 - 节流延迟时间（毫秒）
 * @returns {Function} 节流后的发送函数
 */
export const 创建节流发送函数 = (发送函数, 延迟 = 50) => {
    return 处理器模块.创建节流函数(发送函数, 延迟);
};

// 为了兼容旧接口，创建一个兼容层
export const 数据库 = {
    ...数据库模块,
    
    // 兼容旧接口
    保存日志: (日志列表) => 数据库模块.批量添加日志条目(日志列表),
    加载日志: (页码 = 0, 每页数量 = 100) => 数据库模块.查询日志条目({
        limit: 每页数量,
        offset: 页码 * 每页数量,
        orderBy: 'desc'
    }),
    获取日志计数: async () => {
        const 统计 = await 数据库模块.获取日志统计();
        return 统计.总数;
    }
};

export const 格式化器 = {
    ...格式化器模块
};

export const 处理器 = {
    ...处理器模块,
    日志批处理器: 处理器模块.日志批处理器
};

export const 日志 = 日志模块; 