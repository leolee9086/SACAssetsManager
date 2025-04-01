/**
 * 路径配置
 * 集中管理系统中使用的各种路径
 */

const path = require('path');

/**
 * 获取基础路径配置
 * @param {Object} siyuanConfig - 思源笔记配置对象
 * @returns {Object} 路径配置对象
 */
export const getPathsConfig = (siyuanConfig) => {
    // 如果没有传入思源配置，使用全局变量
    if (!siyuanConfig && window.siyuanConfig) {
        siyuanConfig = window.siyuanConfig;
    }
    
    if (!siyuanConfig?.system?.workspaceDir) {
        throw new Error('思源配置不可用，无法生成路径配置');
    }
    
    const workspaceDir = siyuanConfig.system.workspaceDir;
    const pluginDir = path.join(workspaceDir, 'data/plugins/SACAssetsManager');
    
    return {
        // 思源工作空间目录
        workspaceDir,
        
        // 插件目录
        pluginDir,
        
        // 插件数据目录
        dataDir: path.join(pluginDir, 'data'),
        
        // 插件临时目录
        tempDir: path.join(pluginDir, 'temp'),
        
        // 插件缓存目录
        cacheDir: path.join(pluginDir, 'cache'),
        
        // 缩略图缓存目录
        thumbnailsDir: path.join(pluginDir, 'thumbnails'),
        
        // 数据库目录
        databaseDir: path.join(pluginDir, 'database'),
        
        // 外部模块目录
        nodeModulesDir: path.join(pluginDir, 'node_modules'),
        
        // 思源数据目录
        siyuanDataDir: path.join(workspaceDir, 'data'),
        
        // 思源资源目录
        siyuanAssetsDir: path.join(workspaceDir, 'data/assets'),
        
        // 日志目录
        logsDir: path.join(pluginDir, 'logs'),
        
        // 获取相对于工作空间的路径
        getRelativePath: (absolutePath) => {
            return path.relative(workspaceDir, absolutePath);
        },
        
        // 获取绝对路径
        getAbsolutePath: (relativePath) => {
            if (path.isAbsolute(relativePath)) {
                return relativePath;
            }
            return path.join(workspaceDir, relativePath);
        }
    };
};

/**
 * 当前路径配置
 * 在配置加载后会被初始化
 * @type {Object}
 */
export let currentPaths = null;

/**
 * 初始化路径配置
 * @param {Object} siyuanConfig - 思源笔记配置对象
 * @returns {Object} 路径配置对象
 */
export const initPaths = (siyuanConfig) => {
    currentPaths = getPathsConfig(siyuanConfig);
    return currentPaths;
};

/**
 * 获取当前路径配置
 * 如果尚未初始化，则尝试使用全局配置初始化
 * @returns {Object} 路径配置对象
 */
export const getPaths = () => {
    if (!currentPaths && window.siyuanConfig) {
        return initPaths(window.siyuanConfig);
    }
    return currentPaths;
}; 