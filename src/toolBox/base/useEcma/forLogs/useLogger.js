/**
 * 日志工具
 * 用于统一处理日志，支持不同级别的日志记录
 */

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
 * 格式化日志
 * @param {String} 级别 - 日志级别
 * @param {any} 内容 - 日志内容
 * @param {String} 来源 - 日志来源
 * @param {Object|null} 选项 - 额外选项，包含元数据和标签
 * @returns {Object} 格式化后的日志对象
 */
export const 格式化日志 = (级别, 内容, 来源 = '', 选项 = null) => {
    // 使用内部简化版格式化
    const 时间 = new Date().toISOString();
    let 格式化内容 = 内容;
    let 元数据 = 选项?.元数据 || null;
    let 标签 = 选项?.标签 || [];
    
    // 检查内容类型并格式化
    if (typeof 内容 !== 'string') {
        try {
            if (内容 instanceof Error) {
                格式化内容 = `${内容.message}\n${内容.stack || ''}`;
                // 为错误添加元数据
                元数据 = {
                    ...(元数据 || {}),
                    错误类型: 内容.name,
                    错误消息: 内容.message,
                    错误栈: 内容.stack
                };
            } else {
                // 尝试简单的JSON序列化
                格式化内容 = JSON.stringify(内容, null, 2);
            }
        } catch (错误) {
            格式化内容 = String(内容) + ' [无法完全序列化]';
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

/**
 * 创建带有元数据和标签的控制台输出文本
 * @param {Object} 日志 - 日志对象
 * @returns {String} 格式化的控制台输出
 */
export const 创建控制台输出 = (日志) => {
    const 标签文本 = 日志.标签?.length > 0 ? ` [标签:${日志.标签.join(',')}]` : '';
    const 元数据提示 = 日志.元数据 ? ' [+元数据]' : '';
    return `[${日志.时间}] [${日志.级别.toUpperCase()}] ${日志.来源 ? `[${日志.来源}] ` : ''}${日志.内容}${标签文本}${元数据提示}`;
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