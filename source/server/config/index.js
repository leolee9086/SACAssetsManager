/**
 * 配置系统
 * 集中管理和导出所有配置
 */

import { initPaths, getPaths, currentPaths } from './paths.js';
import { initServerConfig, getServerConfig, updateServerConfig, defaultServerConfig, currentServerConfig } from './server.js';
import { initServicesConfig, getServicesConfig, getServiceConfig, updateServicesConfig, updateServiceConfig, defaultServicesConfig, currentServicesConfig } from './services.js';
import { 日志 } from '../../../../src/toolBox/base/useEcma/forLogs/useLogger.js';

/**
 * 初始化所有配置
 * @param {Object} siyuanConfig - 思源笔记配置
 * @param {Object} options - 配置选项
 * @returns {Object} 所有配置
 */
export const initConfig = async (siyuanConfig = null, options = {}) => {
    try {
        // 初始化路径配置
        const pathsConfig = initPaths(siyuanConfig || window.siyuanConfig);
        
        // 初始化服务器配置
        const serverConfig = initServerConfig(options.server || {});
        
        // 初始化服务配置
        const servicesConfig = initServicesConfig(options.services || {});
        
        日志.信息('配置系统初始化完成', 'Config');
        
        return {
            paths: pathsConfig,
            server: serverConfig,
            services: servicesConfig
        };
    } catch (error) {
        日志.错误(`配置系统初始化失败: ${error.message}`, 'Config');
        throw error;
    }
};

/**
 * 获取当前配置
 * @returns {Object} 所有配置
 */
export const getConfig = () => {
    return {
        paths: currentPaths,
        server: currentServerConfig,
        services: currentServicesConfig
    };
};

/**
 * 更新配置
 * @param {Object} newConfig - 新配置
 * @returns {Object} 更新后的配置
 */
export const updateConfig = (newConfig = {}) => {
    if (newConfig.server) {
        updateServerConfig(newConfig.server);
    }
    
    if (newConfig.services) {
        updateServicesConfig(newConfig.services);
    }
    
    return getConfig();
};

// 导出所有配置相关函数
export {
    // 路径配置
    getPaths,
    initPaths,
    
    // 服务器配置
    getServerConfig,
    initServerConfig,
    updateServerConfig,
    defaultServerConfig,
    
    // 服务配置
    getServicesConfig,
    getServiceConfig,
    initServicesConfig,
    updateServicesConfig,
    updateServiceConfig,
    defaultServicesConfig
}; 