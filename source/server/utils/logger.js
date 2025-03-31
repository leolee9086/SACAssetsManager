/**
 * 日志工具
 * 用于统一处理日志，支持不同级别的日志记录，并通过IndexedDB存储
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

// 日志格式
const 格式化日志 = (级别, 内容, 来源 = '') => {
    const 时间 = new Date().toISOString();
    let 格式化内容 = 内容;
    
    // 检查内容类型并格式化
    if (typeof 内容 !== 'string') {
        try {
            if (内容 instanceof Error) {
                格式化内容 = `${内容.message}\n${内容.stack || ''}`;
            } else {
                // 限制对象深度和长度，避免循环引用和过大对象导致性能问题
                格式化内容 = JSON.stringify(内容, (key, value) => {
                    // 处理循环引用
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[循环引用]';
                        }
                        seen.add(value);
                    }
                    return value;
                }, 2);
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
        来源
    };
};

// 用于检测循环引用
const seen = new WeakSet();

// 发送日志到UI
const 发送日志 = (日志) => {
    // 防止递归调用
    if (正在记录日志) return;
    
    try {
        if (window.日志组件) {
            window.日志组件.添加日志(日志);
        }
    } catch (错误) {
        console.error('发送日志到UI失败:', 错误);
    }
};

// 导出日志方法
export const 日志 = {
    信息: (内容, 来源 = '') => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.INFO, 内容, 来源);
            发送日志(日志);
            console.log(`[${日志.时间}] [INFO] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        } finally {
            正在记录日志 = false;
        }
    },
    警告: (内容, 来源 = '') => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.WARN, 内容, 来源);
            发送日志(日志);
            console.warn(`[${日志.时间}] [WARN] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        } finally {
            正在记录日志 = false;
        }
    },
    错误: (内容, 来源 = '') => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.ERROR, 内容, 来源);
            发送日志(日志);
            console.error(`[${日志.时间}] [ERROR] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        } finally {
            正在记录日志 = false;
        }
    },
    调试: (内容, 来源 = '') => {
        if (正在记录日志) return;
        正在记录日志 = true;
        
        try {
            const 日志 = 格式化日志(日志级别.DEBUG, 内容, 来源);
            发送日志(日志);
            console.debug(`[${日志.时间}] [DEBUG] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
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
                return 格式化日志(日志.级别, 日志.内容, 日志.来源);
            });
            
            // 批量发送到UI (假设UI组件有批量添加方法)
            if (window.日志组件 && window.日志组件.批量添加日志) {
                window.日志组件.批量添加日志(处理后日志列表);
            } else {
                // 否则逐个发送
                处理后日志列表.forEach(日志 => 发送日志(日志));
            }
            
            // 只在控制台打印批量日志的摘要
            console.log(`批量添加了 ${处理后日志列表.length} 条日志`);
        } finally {
            正在记录日志 = false;
        }
    }
}; 