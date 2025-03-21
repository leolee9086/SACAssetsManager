/**
 * 错误类型枚举
 */
const 错误类型 = {
    无效输入: '无效输入',
    处理失败: '处理失败',
    未知错误: '未知错误'
};

/**
 * 创建基础文本上下文
 */
const 创建基础上下文 = (初始文本 = '') => ({
    文本: String(初始文本),
    错误: null
});

/**
 * 安全执行处理器
 */
const 安全执行 = (处理器名称) => (处理函数) => (上下文) => {
    if (上下文.错误) return 上下文;
    
    try {
        return 处理函数(上下文);
    } catch (错误) {
        return {
            ...上下文,
            错误: {
                类型: 错误类型.处理失败,
                消息: `${处理器名称}处理失败: ${错误.message}`,
                原始错误: 错误
            }
        };
    }
};

/**
 * 基础文本处理器
 */
const 基础处理器 = {
    转大写: 安全执行('转大写')((上下文) => ({
        ...上下文,
        文本: 上下文.文本.toUpperCase()
    })),
    
    转小写: 安全执行('转小写')((上下文) => ({
        ...上下文,
        文本: 上下文.文本.toLowerCase()
    })),
    
    分割: (分隔符) => 安全执行('分割')((上下文) => ({
        ...上下文,
        文本: Array.isArray(上下文.文本) 
            ? 上下文.文本 
            : 上下文.文本.split(分隔符)
    })),

    连接: (连接符 = '') => 安全执行('连接')((上下文) => ({
        ...上下文,
        文本: Array.isArray(上下文.文本) 
            ? 上下文.文本.join(连接符)
            : 上下文.文本
    }))
};

/**
 * 结果处理器
 */
const 结果处理器 = {
    获取文本: 安全执行('获取文本')((上下文) => 上下文.文本),
    
    格式化: (转换函数) => 安全执行('格式化')((上下文) => ({
        ...上下文,
        文本: 转换函数(上下文.文本)
    }))
};

/**
 * 管道函数 - 用于组合多个处理器
 */
const 管道 = (...处理器组) => (初始值) => {
    if (!初始值 || typeof 初始值 !== 'object') {
        return {
            文本: null,
            错误: {
                类型: 错误类型.无效输入,
                消息: '管道初始值必须是有效的上下文对象'
            }
        };
    }

    return 处理器组.reduce((上下文, 处理器) => {
        if (上下文.错误) return 上下文;
        try {
            return 处理器(上下文);
        } catch (错误) {
            return {
                ...上下文,
                错误: {
                    类型: 错误类型.未知错误,
                    消息: '管道执行错误',
                    原始错误: 错误
                }
            };
        }
    }, 初始值);
};

/**
 * 创建文本工具实例
 */
export const 创建文本工具 = (初始文本) => {
    // 统一返回处理器函数
    return {
        转大写: () => 基础处理器.转大写,
        转小写: () => 基础处理器.转小写,
        分割: (分隔符) => 基础处理器.分割(分隔符),
        连接: (连接符) => 基础处理器.连接(连接符),
        格式化: (转换函数) => 结果处理器.格式化(转换函数),
        获取文本: () => 结果处理器.获取文本,
        管道,
        创建上下文: () => 创建基础上下文(初始文本)
    };
};

