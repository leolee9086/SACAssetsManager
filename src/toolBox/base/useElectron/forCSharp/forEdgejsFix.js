
/**
 * 检查思源配置
 * 
 * @returns {Object|null} 思源工作空间路径或null（如果配置不可用）
 */
const 检查思源配置 = () => {
    if (!global.siyuanConfig || !global.siyuanConfig.system) {
        console.warn('无法获取思源配置，DLL路径设置失败');
        return null;
    }
    return global.siyuanConfig.system.workspaceDir;
};

/**
 * 获取DLL路径
 * 
 * @param {String} 思源工作空间路径 - 思源工作空间路径
 * @param {Object} path - path模块
 * @returns {Object} 包含原始DLL路径和新DLL链接路径的对象
 */
const 获取DLL路径 = (思源工作空间路径, path) => {
    const 原始DLL路径 = path.join(思源工作空间路径, '/data/plugins/SACAssetsManager/node_modules/electron-edge-js/node_modules/edge-cs/lib/').replace(/\\/g, '/');
    const 新DLL链接路径 = path.join(process.env.ALLUSERSPROFILE, "sac").replace(/\\/g, '/');
    
    return { 原始DLL路径, 新DLL链接路径 };
};

/**
 * 确保目录存在
 * 
 * @param {String} 目录路径 - 要确保存在的目录路径
 * @param {Object} fs - fs-extra模块
 */
const 确保目录存在 = (目录路径, fs) => {
    if (!fs.existsSync(目录路径)) {
        fs.mkdirSync(目录路径, { recursive: true });
    }
};

/**
 * 复制DLL文件
 * 
 * @param {String} 源路径 - 源路径
 * @param {String} 目标路径 - 目标路径
 * @param {Object} fs - fs-extra模块
 */
const 复制DLL文件 = (源路径, 目标路径, fs) => {
    try {
        fs.copySync(源路径, 目标路径);
    } catch (e) {
        console.warn('复制DLL文件失败', e);
    }
};
/**
 * 设置dll路径
 * 解决Windows下非ASCII字符路径问题
 * 
 * @returns {void}
 */
export const 设置DLL路径 = () => {
    try {
        const path = require('path');
        const fs = require('fs-extra');
        
        const 思源工作空间路径 = 检查思源配置();
        if (!思源工作空间路径) {
            return;
        }
        
        const { 原始DLL路径, 新DLL链接路径 } = 获取DLL路径(思源工作空间路径, path);
        
        确保目录存在(新DLL链接路径, fs);
        
        复制DLL文件(原始DLL路径, 新DLL链接路径, fs);
        
        // 设置环境变量
        process.env.EDGE_CS_NATIVE = (path.join(新DLL链接路径, 'edge-cs.dll')).replace(/\\/g, '/');
    } catch (e) {
        console.error('设置DLL路径失败', e);
    }
};

