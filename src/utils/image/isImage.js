const path = require('path')
export const isImage = (file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
};



/**
 * 验证缓冲区对象是否有效
 * @param {Object} buffer - 图像的缓冲区对象
 * @returns {boolean} 是否有效
 */
export function isValidImageBuffer(buffer) {
    return buffer.type || buffer.isImage || Buffer.isBuffer(buffer)
}