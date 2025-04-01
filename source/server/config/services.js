/**
 * 服务配置
 * 集中管理各个服务的配置
 */

import { getPaths } from './paths.js';

/**
 * 默认服务配置
 * @type {Object}
 */
export const defaultServicesConfig = {
    // 文件系统服务配置
    fs: {
        // 是否启用缓存
        enableCache: true,
        // 缓存超时时间(毫秒)
        cacheTimeout: 5 * 60 * 1000,
        // 监视文件变化
        watchFiles: true,
        // 最大并发操作数
        maxConcurrent: 10
    },
    
    // 数据库服务配置
    db: {
        // 数据库类型 (sqlite, leveldb)
        type: 'sqlite',
        // 数据库文件路径（相对于数据库目录）
        filename: 'main.db',
        // 是否启用WAL模式(SQLite)
        useWAL: true,
        // 是否自动压缩
        autoCompact: true,
        // 连接池大小
        poolSize: 5,
        // 查询超时(毫秒)
        queryTimeout: 30000,
        // 是否记录查询日志
        logQueries: false
    },
    
    // 缩略图服务配置
    thumbnail: {
        // 缩略图质量 (1-100)
        quality: 80,
        // 默认大小
        defaultSize: 200,
        // 预生成大小列表
        sizes: [100, 200, 300, 500],
        // 最大尺寸
        maxSize: 1000,
        // 缓存策略 (memory, disk, both)
        cacheStrategy: 'both',
        // 是否保持宽高比
        keepAspectRatio: true,
        // 背景颜色
        background: '#ffffff',
        // 最大缓存项数
        maxCacheItems: 5000,
        // 是否自动清理过期缩略图
        autoCleanup: true,
        // 清理阈值(天)
        cleanupThreshold: 30
    },
    
    // 颜色服务配置
    color: {
        // 默认提取的颜色数量
        defaultColorCount: 5,
        // 是否忽略白色背景
        ignoreWhiteBackground: true,
        // 颜色距离阈值
        colorDistanceThreshold: 20,
        // 是否使用缓存
        useCache: true,
        // 是否使用快速模式(减少采样点)
        fastMode: false
    },
    
    // 日志服务配置
    logger: {
        // 日志级别 (debug, info, warn, error)
        level: 'info',
        // 是否记录到文件
        logToFile: true,
        // 日志文件名格式
        fileFormat: 'YYYY-MM-DD',
        // 是否记录时间戳
        timestamp: true,
        // 是否记录调用堆栈
        stack: false,
        // 是否启用颜色
        colors: true,
        // 最大保留日志数量
        maxFiles: 30,
        // 单个日志文件最大大小(MB)
        maxSize: 10
    },
    
    // 许可证服务配置
    license: {
        // 许可证检查间隔(毫秒)
        checkInterval: 86400000, // 24 小时
        // 宽限期(毫秒)
        gracePeriod: 7 * 86400000, // 7 天
        // 是否强制执行许可证限制
        enforce: true
    }
};

/**
 * 当前服务配置
 * 在初始化时会被设置
 * @type {Object}
 */
export let currentServicesConfig = { ...defaultServicesConfig };

/**
 * 初始化服务配置
 * @param {Object} config - 配置对象，将覆盖默认配置
 * @returns {Object} 合并后的配置对象
 */
export const initServicesConfig = (config = {}) => {
    // 深度合并配置
    currentServicesConfig = mergeConfigs(defaultServicesConfig, config);
    
    // 设置默认路径
    const paths = getPaths();
    if (paths) {
        // 设置缩略图目录
        if (!currentServicesConfig.thumbnail.cacheDir) {
            currentServicesConfig.thumbnail.cacheDir = paths.thumbnailsDir;
        }
        
        // 设置数据库目录
        if (!currentServicesConfig.db.dir) {
            currentServicesConfig.db.dir = paths.databaseDir;
        }
        
        // 设置日志目录
        if (!currentServicesConfig.logger.dir) {
            currentServicesConfig.logger.dir = paths.logsDir;
        }
    }
    
    return currentServicesConfig;
};

/**
 * 获取当前服务配置
 * @returns {Object} 当前服务配置
 */
export const getServicesConfig = () => {
    return currentServicesConfig;
};

/**
 * 获取特定服务的配置
 * @param {string} serviceName - 服务名称
 * @returns {Object} 服务配置
 */
export const getServiceConfig = (serviceName) => {
    return currentServicesConfig[serviceName] || {};
};

/**
 * 更新服务配置
 * @param {Object} config - 新的配置对象，将合并到当前配置
 * @returns {Object} 更新后的配置对象
 */
export const updateServicesConfig = (config = {}) => {
    currentServicesConfig = mergeConfigs(currentServicesConfig, config);
    return currentServicesConfig;
};

/**
 * 更新特定服务的配置
 * @param {string} serviceName - 服务名称
 * @param {Object} config - 新的服务配置
 * @returns {Object} 更新后的服务配置
 */
export const updateServiceConfig = (serviceName, config = {}) => {
    if (!currentServicesConfig[serviceName]) {
        currentServicesConfig[serviceName] = {};
    }
    
    currentServicesConfig[serviceName] = mergeConfigs(
        currentServicesConfig[serviceName],
        config
    );
    
    return currentServicesConfig[serviceName];
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