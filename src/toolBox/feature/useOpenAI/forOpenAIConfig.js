/**
 * @fileoverview OpenAI兼容配置工具
 * @description 提供OpenAI API和兼容API的配置标准化功能
 */

/**
 * 标准化OpenAI兼容配置
 * @param {Object} 配置 - 原始配置对象
 * @returns {Object} 标准化后的配置对象
 */
export function 标准化openAI兼容配置(配置 = {}) {
    const 默认配置 = {
        model: 'deepseek-ai/DeepSeek-R1',
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1.0,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true
    };

    // 参数校验
    if (!配置.apiKey) {
        throw new Error('API密钥不能为空');
    }
    if (配置.temperature && (配置.temperature < 0 || 配置.temperature > 2)) {
        throw new Error('temperature参数必须在0到2之间');
    }

    // 深度合并headers
    const 请求头 = {
        'Content-Type': 'application/json',
        ...(配置.headers || {}),
        // 确保Authorization总是基于最新的apiKey
        'Authorization': `Bearer ${配置.apiKey}`
    };

    // 处理stream模式
    if (配置.stream) {
        请求头['Accept'] = 'text/event-stream';
        请求头['Cache-Control'] = 'no-cache';
        请求头['Connection'] = 'keep-alive';
    }

    // 处理代理配置
    let 最终端点 = 标准化端点(配置.endpoint);
    if (配置.proxy) {
        最终端点 = 配置.proxy + 最终端点;
    }

    // 处理apiModel参数兼容
    if (配置.apiModel) {
        配置.model = 配置.apiModel;
        delete 配置.apiModel;
    }

    return {
        ...默认配置,
        ...配置,
        // 确保apiKey不会被覆盖
        apiKey: 配置.apiKey,
        endpoint: 最终端点,
        headers: 请求头,
        // 添加时间戳用于调试
        _timestamp: Date.now()
    };
}

/**
 * 标准化API端点
 * @private
 */
function 标准化端点(端点) {
    // 如果没有指定endpoint，则使用OpenAI默认端点
    if (!端点) {
        return 'https://api.openai.com/v1/chat/completions';
    }
    
    // 如果是相对URL，添加OpenAI基础URL
    if (!端点.startsWith('http')) {
        return `https://api.openai.com${端点.startsWith('/') ? '' : '/'}${端点}`;
    }
    
    return 端点;
}

// 英文别名
export const normalizeOpenAIConfig = 标准化openAI兼容配置;

// 支持默认导出
export default 标准化openAI兼容配置;