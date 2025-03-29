/**
 * @fileoverview 资产标签相关工具函数
 */

/**
 * 计算标签文件数量
 * @param {Array} fileTags 文件标签数组，每个元素包含tags属性
 * @returns {Object} 标签计数对象，键为标签名，值为文件数量
 */
export function 计算标签文件数量(fileTags) {
    const counts = {}
    fileTags.forEach(file => {
        file.tags.forEach(tag => {
            counts[tag] = (counts[tag] || 0) + 1
        })
    })
    return counts
} 