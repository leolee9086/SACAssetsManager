/**
 * 文件状态处理模块
 * 提供获取文件状态的纯函数
 */
const fs = require('fs').promises;
const path = require('path');

/**
 * 从上下文获取文件状态信息
 * @param {Object} context - 包含文件路径的上下文
 * @returns {Promise<Object>} 包含文件状态的对象
 */
const useFileStatus = async (context) => {
    const { filePath } = context;
    
    if (!filePath) {
        throw new Error('必须提供文件路径(filePath)');
    }
    
    // 创建新对象，不修改输入参数
    const result = {
        normalizedPath: path.normalize(filePath),
        fileExists: true,
        fileStats: null,
        fs,
        path
    };
    
    try {
        result.fileStats = await fs.stat(result.normalizedPath);
    } catch (statError) {
        if (statError.code === 'ENOENT') {
            result.fileExists = false;
        } else {
            throw statError;
        }
    }
    
    return result;
};

// 导出模块功能
export { useFileStatus }; 