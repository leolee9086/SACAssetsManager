/**
 * 日志工具
 * 用于统一处理日志，支持不同级别的日志记录
 */

import { 格式化日志 as 格式化日志完整版, 日志转文本 } from './useLogFormatter.js';
// 引入serialize-javascript库用于处理复杂对象序列化
import serialize from '../../../../../static/serialize-javascript.js';

// 日志级别枚举
const 日志级别 = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
};

// 防止循环调用标记
let 正在记录日志 = false;

/**
 * 创建带有元数据和标签的控制台输出文本
 * @param {Object} 日志 - 日志对象
 * @returns {String} 格式化的控制台输出
 */
export const 创建控制台输出 = (日志) => {
    // 使用更全面的日志转文本函数
    if (日志转文本) {
        return 日志转文本(日志);
    }
    
    // 备用方案
    const 标签文本 = 日志.标签?.length > 0 ? ` [标签:${日志.标签.join(',')}]` : '';
    const 元数据提示 = 日志.元数据 ? ' [+元数据]' : '';
    
    let 内容文本 = 日志.内容;
    if (typeof 内容文本 === 'object' && 内容文本 !== null) {
        try {
            // 使用serialize-javascript来处理复杂对象
            内容文本 = serialize(内容文本, { space: 0 });
        } catch (e) {
            // 如果serialize失败，退回到简单表示
            内容文本 = '[复杂对象]';
        }
    }
    
    return `[${日志.时间}] [${日志.级别.toUpperCase()}] ${日志.来源 ? `[${日志.来源}] ` : ''}${内容文本}${标签文本}${元数据提示}`;
};

/**
 * 格式化日志 - 使用完整版或简化版
 * @param {String} 级别 - 日志级别
 * @param {any} 内容 - 日志内容
 * @param {String} 来源 - 日志来源
 * @param {Object|null} 选项 - 额外选项，包含元数据和标签
 * @returns {Object} 格式化后的日志对象
 */
export const 格式化日志 = (级别, 内容, 来源 = '', 选项 = null) => {
    // 尝试使用完整版格式化
    if (格式化日志完整版) {
        try {
            return 格式化日志完整版(级别, 内容, 来源, 选项);
        } catch (e) {
            console.error('完整版日志格式化失败，降级使用简化版', e);
            // 发生错误时，降级使用简化版
        }
    }
    
    // 简化版格式化逻辑（备用方案）
    const 时间 = new Date().toISOString();
    let 格式化内容 = 内容;
    let 元数据 = 选项?.元数据 || null;
    let 标签 = 选项?.标签 || [];
    
    // 检查内容类型并格式化
    if (typeof 内容 !== 'string') {
        if (内容 instanceof Error) {
            格式化内容 = `${内容.message}\n${内容.stack || ''}`;
            // 为错误添加元数据
            元数据 = {
                ...(元数据 || {}),
                错误类型: 内容.name,
                错误消息: 内容.message,
                错误栈: 内容.stack
            };
        } else if (内容 === null) {
            格式化内容 = 'null';
        } else if (内容 === undefined) {
            格式化内容 = 'undefined';
        } else if (Array.isArray(内容)) {
            // 单独处理数组
            try {
                // 使用serialize处理数组，可以处理数组中的循环引用
                格式化内容 = serialize(内容, { space: 0 });
            } catch (e) {
                格式化内容 = `Array(${内容.length})`;
            }
        } else if (typeof 内容 === 'object') {
            // 对于普通对象，使用serialize处理
            try {
                格式化内容 = serialize(内容, { space: 0 });
            } catch (e) {
                // 备选序列化方法
                try {
                    const objType = Object.prototype.toString.call(内容);
                    const keys = Object.keys(内容);
                    格式化内容 = `${objType} { 键: ${keys.join(', ')} }`;
                } catch (err) {
                    格式化内容 = '[对象]';
                }
            }
        } else {
            // 其他基本类型直接转换为字符串
            格式化内容 = String(内容);
        }
    }
    
    // 处理元数据
    if (元数据) {
        try {
            // 使用serialize处理元数据，确保元数据不会引起序列化问题
            元数据 = JSON.parse(serialize(元数据, { space: 0 }));
        } catch (e) {
            元数据 = { 错误: '元数据格式化失败' };
        }
    }
    
    // 生成唯一ID，用于数据库存储
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    return {
        id,
        时间,
        级别,
        内容: 格式化内容,
        来源,
        元数据,
        标签,
        包含结构化数据: !!元数据
    };
};

// 导出日志方法
export const 使用日志 = {
    信息: (内容, 来源 = '', 选项 = {}) => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.INFO, 内容, 来源, 选项);
            console.log(创建控制台输出(日志));
            return 日志;
        } finally {
            正在记录日志 = false;
        }
    },
    警告: (内容, 来源 = '', 选项 = {}) => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.WARN, 内容, 来源, 选项);
            console.warn(创建控制台输出(日志));
            return 日志;
        } finally {
            正在记录日志 = false;
        }
    },
    错误: (内容, 来源 = '', 选项 = {}) => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.ERROR, 内容, 来源, 选项);
            console.error(创建控制台输出(日志));
            return 日志;
        } finally {
            正在记录日志 = false;
        }
    },
    调试: (内容, 来源 = '', 选项 = {}) => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.DEBUG, 内容, 来源, 选项);
            console.debug(创建控制台输出(日志));
            return 日志;
        } finally {
            正在记录日志 = false;
        }
    },
    // 添加批量日志方法，适用于导入大量日志的情况
    批量添加: (日志列表) => {
        if (正在记录日志 || !Array.isArray(日志列表) || !日志列表.length) return;
        正在记录日志 = true;
        
        try {
            // 确保每个日志条目格式正确
            const 处理后日志列表 = 日志列表.map(日志 => {
                if (!日志.级别) 日志.级别 = 日志级别.INFO;
                if (!日志.来源) 日志.来源 = 'System';
                const 选项 = {
                    元数据: 日志.元数据 || null,
                    标签: 日志.标签 || []
                };
                
                return 格式化日志(日志.级别, 日志.内容, 日志.来源, 选项);
            });
            
            // 只在控制台打印批量日志的摘要
            console.log(`批量添加了 ${处理后日志列表.length} 条日志`);
            return 处理后日志列表;
        } finally {
            正在记录日志 = false;
        }
    }
};

// 兼容旧的导出名称
export const 日志 = 使用日志;
export const useLogger = 使用日志; 