/**
 * 服务器配置
 * 集中管理服务器相关设置
 */

/**
 * 默认服务器配置
 * @type {Object}
 */
export const defaultServerConfig = {
    // 端口相关配置
    port: {
        // API服务端口，默认使用插件提供的端口
        api: null,
        // 静态资源服务端口，默认为API端口+1
        static: null
    },
    
    // 绑定地址
    host: {
        // API服务绑定地址
        api: '127.0.0.1',
        // 静态资源服务绑定地址
        static: '127.0.0.1'
    },
    
    // CORS设置
    cors: {
        // 是否启用CORS
        enabled: true,
        // 允许的来源
        origin: '*',
        // 允许的方法
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        // 允许的头部
        headers: ['Content-Type', 'Authorization']
    },
    
    // 请求限制
    limits: {
        // 请求体大小限制 (10MB)
        bodySize: 10 * 1024 * 1024,
        // 上传文件大小限制 (50MB)
        fileSize: 50 * 1024 * 1024,
        // 请求超时 (30秒)
        timeout: 30000,
        // 每分钟最大请求数
        rateLimit: 200
    },
    
    // 缓存设置
    cache: {
        // 是否启用HTTP缓存控制
        enabled: true,
        // 缓存有效期 (1天)
        maxAge: 24 * 60 * 60,
        // 缓存策略
        strategy: 'public',
        // 是否启用ETag
        etag: true
    },
    
    // 日志设置
    logging: {
        // 是否在控制台输出请求日志
        requests: true,
        // 是否记录错误
        errors: true,
        // 日志级别 (debug, info, warn, error)
        level: 'info'
    },
    
    // 安全设置
    security: {
        // 是否启用内容安全策略
        csp: false,
        // 是否只接受本地连接
        localOnly: true,
        // 是否验证请求来源
        validateOrigin: false
    }
};

/**
 * 当前服务器配置
 * 在初始化时会被设置
 * @type {Object}
 */
export let currentServerConfig = { ...defaultServerConfig };

/**
 * 初始化服务器配置
 * @param {Object} config - 配置对象，将覆盖默认配置
 * @returns {Object} 合并后的配置对象
 */
export const initServerConfig = (config = {}) => {
    // 深度合并配置
    currentServerConfig = mergeConfigs(defaultServerConfig, config);
    
    // 设置默认的端口 (如果未指定)
    if (!currentServerConfig.port.api && window.port) {
        currentServerConfig.port.api = window.port;
    }
    
    if (!currentServerConfig.port.static && currentServerConfig.port.api) {
        currentServerConfig.port.static = currentServerConfig.port.api + 1;
    }
    
    return currentServerConfig;
};

/**
 * 获取当前服务器配置
 * @returns {Object} 当前服务器配置
 */
export const getServerConfig = () => {
    return currentServerConfig;
};

/**
 * 更新服务器配置
 * @param {Object} config - 新的配置对象，将合并到当前配置
 * @returns {Object} 更新后的配置对象
 */
export const updateServerConfig = (config = {}) => {
    currentServerConfig = mergeConfigs(currentServerConfig, config);
    return currentServerConfig;
};

/**
 * 深度合并配置对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
const mergeConfigs = (target, source) => {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] === undefined) {
            continue;
        }
        
        if (
            source[key] !== null &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
        ) {
            result[key] = mergeConfigs(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}; 