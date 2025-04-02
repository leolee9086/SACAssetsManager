/**
 * 文件创建模块
 * 提供文件创建功能
 */

/**
 * 创建文件（如需要）
 * @param {Object} context - 上下文对象
 * @param {Object} options - 操作选项
 * @returns {Promise<Object>} 更新后的上下文
 */
const withFileCreation = async (context, options) => {
    // 解构上下文，允许修改context
    const { normalizedPath, fileExists, fs, path } = context;
    // 解构选项，确保不修改
    const { 
        createIfNotExists = false, 
        defaultContent = '',
        skipIfNotExists = false,
        logProcess = false
    } = options;
    
    if (!fileExists && createIfNotExists) {
        // 确保目录存在
        await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
        
        // 创建文件
        await fs.writeFile(normalizedPath, defaultContent);
        
        context.fileStats = await fs.stat(normalizedPath);
        context.fileExists = true;
        
        if (logProcess) console.log(`已创建文件: ${normalizedPath}`);
    } else if (!fileExists && !skipIfNotExists) {
        throw new Error(`文件不存在: ${normalizedPath}`);
    }
    
    return context;
};

// 导出模块功能
export { withFileCreation }; 