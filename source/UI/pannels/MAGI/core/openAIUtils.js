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
        headers:请求头,
        // 添加时间戳用于调试
        _timestamp: Date.now()
    };
}
// 工具函数：标准化端点URL
function 标准化端点(endpoint) {
    const baseURL = endpoint || 'https://api.siliconflow.cn/v1/'
    const shouldAppendPath = !baseURL.includes('chat/completions')
    const sanitizedURL = baseURL.replace(/\/$/, '')
    return shouldAppendPath ? `${sanitizedURL}/chat/completions` : baseURL
}