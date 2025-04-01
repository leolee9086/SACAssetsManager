/**
 * API处理器模板
 * 提供标准化的API处理器结构和辅助函数
 */

import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
import { getServerConfig } from '../../config/server.js';
import { getServiceConfig } from '../../config/services.js';

/**
 * @typedef {import('../../types/api.js').APIContext} APIContext
 * @typedef {import('../../types/api.js').APIResponse} APIResponse
 */

/**
 * 创建统一的成功响应
 * @param {*} data - 响应数据
 * @param {string} [message='操作成功'] - 成功消息
 * @param {number} [code=200] - 状态码
 * @returns {APIResponse} 标准响应对象
 */
export const createSuccessResponse = (data, message = '操作成功', code = 200) => {
    return {
        success: true,
        data,
        message,
        code
    };
};

/**
 * 创建统一的错误响应
 * @param {Error|string} error - 错误对象或消息
 * @param {string} [message='操作失败'] - 错误消息
 * @param {number} [code=500] - 状态码
 * @returns {APIResponse} 标准响应对象
 */
export const createErrorResponse = (error, message = '操作失败', code = 500) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    return {
        success: false,
        error: errorObj.message,
        message: message || errorObj.message,
        code,
        stack: getServerConfig().logging.level === 'debug' ? errorObj.stack : undefined
    };
};

/**
 * 标准化API处理器
 * @param {function(APIContext): Promise<APIResponse|*>} handler - 处理器函数
 * @returns {function(APIContext): Promise<void>} 标准化处理器
 */
export const standardizeHandler = (handler) => {
    return async (ctx) => {
        const { req, res } = ctx;
        const startTime = Date.now();
        
        try {
            const result = await handler(ctx);
            
            // 如果处理器已经发送了响应，则不再发送
            if (res.headersSent) {
                return;
            }
            
            // 如果结果已经是标准响应格式，直接发送
            if (result && typeof result === 'object' && 'success' in result) {
                res.json(result);
                return;
            }
            
            // 否则包装为成功响应
            res.json(createSuccessResponse(result));
        } catch (error) {
            // 记录错误
            日志.错误(`API错误: ${error.message}`, 'API');
            
            // 如果响应未发送，则发送错误响应
            if (!res.headersSent) {
                res.status(error.statusCode || 500)
                   .json(createErrorResponse(error));
            }
        } finally {
            // 记录请求耗时
            const duration = Date.now() - startTime;
            if (getServerConfig().logging.requests) {
                日志.信息(
                    `${req.method} ${req.originalUrl || req.url} - ${duration}ms`,
                    'API'
                );
            }
        }
    };
};

/**
 * 记录API请求
 * @param {APIContext} ctx - API上下文
 * @param {function} next - 下一个中间件
 */
export const logRequest = async (ctx, next) => {
    const { req } = ctx;
    const startTime = Date.now();
    
    日志.信息(`开始处理: ${req.method} ${req.originalUrl || req.url}`, 'API');
    
    try {
        await next();
    } finally {
        const duration = Date.now() - startTime;
        日志.信息(
            `完成处理: ${req.method} ${req.originalUrl || req.url} - ${duration}ms`,
            'API'
        );
    }
};

/**
 * 处理API错误
 * @param {Error} error - 错误对象
 * @param {APIContext} ctx - API上下文
 * @param {function} next - 下一个中间件
 */
export const handleError = async (error, ctx, next) => {
    const { res } = ctx;
    
    日志.错误(`API处理错误: ${error.message}`, 'API');
    
    if (!res.headersSent) {
        res.status(error.statusCode || 500)
           .json(createErrorResponse(error));
    }
};

/**
 * 创建带有服务配置的上下文
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {string} serviceName - 服务名称
 * @returns {APIContext} 扩展的API上下文
 */
export const createServiceContext = (req, res, serviceName) => {
    return {
        req,
        res,
        params: req.params,
        query: req.query, 
        body: req.body,
        config: getServiceConfig(serviceName),
        stats: {}
    };
}; 