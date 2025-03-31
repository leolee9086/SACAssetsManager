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

// 日志格式
const 格式化日志 = (级别, 内容, 来源 = '') => {
    const 时间 = new Date().toISOString();
    return {
        时间,
        级别,
        内容: typeof 内容 === 'string' ? 内容 : JSON.stringify(内容),
        来源
    };
};

// 发送日志到UI
const 发送日志 = (日志) => {
    // 防止递归调用
    if (正在记录日志) return;
    
    if (window.日志组件) {
        window.日志组件.添加日志(日志);
    }
};

// 导出日志方法
export const 日志 = {
    信息: (内容, 来源 = '') => {
        正在记录日志 = true;
        const 日志 = 格式化日志(日志级别.INFO, 内容, 来源);
        发送日志(日志);
        console.log(`[${日志.时间}] [INFO] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        正在记录日志 = false;
    },
    警告: (内容, 来源 = '') => {
        正在记录日志 = true;
        const 日志 = 格式化日志(日志级别.WARN, 内容, 来源);
        发送日志(日志);
        console.warn(`[${日志.时间}] [WARN] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        正在记录日志 = false;
    },
    错误: (内容, 来源 = '') => {
        正在记录日志 = true;
        const 日志 = 格式化日志(日志级别.ERROR, 内容, 来源);
        发送日志(日志);
        console.error(`[${日志.时间}] [ERROR] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        正在记录日志 = false;
    },
    调试: (内容, 来源 = '') => {
        正在记录日志 = true;
        const 日志 = 格式化日志(日志级别.DEBUG, 内容, 来源);
        发送日志(日志);
        console.debug(`[${日志.时间}] [DEBUG] ${来源 ? `[${来源}] ` : ''}${日志.内容}`);
        正在记录日志 = false;
    }
}; 