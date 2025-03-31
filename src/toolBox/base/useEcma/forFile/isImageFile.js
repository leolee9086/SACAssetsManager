/**
 * 文件图片检测工具
 * 用于判断文件是否为图片文件
 */

const 图片扩展名列表 = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.heic', '.heif'];

/**
 * 判断文件是否为图片文件
 * @param {string} 文件名 - 文件名或文件路径
 * @returns {boolean} 是否为图片文件
 */
export const 是图片文件 = (文件名) => {
    if (!文件名) return false;
    const 路径 = typeof window !== 'undefined' && window.path ? window.path : 
                 typeof require !== 'undefined' ? require('path') : null;
    
    if (!路径) {
        // 如果无法获取path模块，使用纯JavaScript实现
        const 最后一个点索引 = 文件名.lastIndexOf('.');
        if (最后一个点索引 === -1) return false;
        const 扩展名 = 文件名.slice(最后一个点索引).toLowerCase();
        return 图片扩展名列表.includes(扩展名);
    } else {
        return 图片扩展名列表.includes(路径.extname(文件名).toLowerCase());
    }
};

/**
 * 获取支持的图片扩展名列表
 * @returns {string[]} 支持的图片扩展名列表
 */
export const 获取支持的图片扩展名 = () => {
    return [...图片扩展名列表];
}; 