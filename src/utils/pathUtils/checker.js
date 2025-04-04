/**
 * 判断是否是思源的资产路径
 * 用于判定笔记中引用的资产链接是否是来自思源的
 * @param {string} path - 路径
 * @returns {boolean} - 是否是思源的资产路径
 */
export function isSiyuanAssetPath(path) {
    return path && path.startsWith('assets/')
}




