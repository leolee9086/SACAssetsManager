export function 计算主标签(assets, 模式) {
    if (模式 && 模式.label) {
        return 模式 && 模式.label + ':' + '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
    } else {
        return '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
    }
}