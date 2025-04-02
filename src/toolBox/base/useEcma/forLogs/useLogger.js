/**
 * 日志工具
 * 用于统一处理日志，支持不同级别的日志记录
 */

import { 
    格式化日志 as 格式化日志完整版, 
    日志转文本, 
    安全序列化, 
    格式化元数据 
} from './useLogFormatter.js';

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
    // 直接使用useLogFormatter的日志转文本函数
    return 日志转文本(日志);
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
    try {
        // 尝试使用完整版格式化
        return 格式化日志完整版(级别, 内容, 来源, 选项);
    } catch (e) {
        
        // 简化版格式化逻辑（备用方案）
        const 时间 = new Date().toISOString();
        let 格式化内容 = 内容;
        let 元数据 = 选项?.元数据 || null;
        let 标签 = 选项?.标签 || [];
        
        // 检查内容类型并简单格式化
        if (格式化内容 === null) {
            格式化内容 = 'null';
        } else if (格式化内容 === undefined) {
            格式化内容 = 'undefined';
        } else if (格式化内容 instanceof Error) {
            格式化内容 = `${格式化内容.message}\n${格式化内容.stack || ''}`;
        } else if (typeof 格式化内容 !== 'string') {
            try {
                格式化内容 = 安全序列化(格式化内容);
            } catch (序列化错误) {
                格式化内容 = `[无法序列化的${typeof 格式化内容}]`;
            }
        }
        
        // 处理元数据
        if (元数据) {
            try {
                元数据 = 格式化元数据(元数据);
            } catch (元数据错误) {
                元数据 = { 错误: '元数据格式化失败' };
            }
        }
        
        // 生成唯一ID
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
    }
};

// 导出日志方法,注意这些方法里绝对不能使用console,否则会循环引用
export const 使用日志 = {
    信息: (内容, 来源 = '', 选项 = {}) => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.INFO, 内容, 来源, 选项);
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
            const 处理后日志列表 = 日志列表.map(日志 => {
                if (!日志.级别) 日志.级别 = 日志级别.INFO;
                if (!日志.来源) 日志.来源 = 'System';
                const 选项 = {
                    元数据: 日志.元数据 || null,
                    标签: 日志.标签 || []
                };
                
                return 格式化日志(日志.级别, 日志.内容, 日志.来源, 选项);
            });
            return 处理后日志列表;
        } finally {
            正在记录日志 = false;
        }
    }
};

// 兼容旧的导出名称
export const 日志 = 使用日志;
export const useLogger = 使用日志; 