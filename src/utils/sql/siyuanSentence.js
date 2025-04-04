export const 查询块id数组 = (id数组) => {
    return `select * from blocks where id in (${id数组.join(',')})`
}
export const 按笔记本查询附件 = (box, limit, offset) => {
    return `select * from assets where box = '${box}' limit ${limit || 100} offset ${offset || 0}`
}
export const 查询所有附件 = (limit, offset) => {
    return `select * from assets limit ${limit || 100} offset ${offset || 0}`
}
export const 按文档ID查询所有子文档附件 = (docId, limit, offset) => {
    return `select * from assets where docpath like '%${docId}%' limit ${limit || 100} offset ${offset || 0}`
}
export const 按文档ID查询file链接 = (docId, limit, offset) => {
    return `
    SELECT *
    FROM spans
    WHERE type = "textmark a"
      AND markdown LIKE "%\]\(file\:\/\/\/%"
      AND root_id = "${docId}"
    LIMIT ${limit || 100} OFFSET ${offset || 0}`
}
/**
 * 根据素材路径数组查询对应的笔记信息
 * @param {string[]} assetPaths - 素材路径数组
 * @returns {Promise<Array>} 返回包含素材所在笔记信息的数组
 */
export const 获取数组中素材所在笔记 = async (assetPaths) => {
    // 更新最后处理的路径列表
    const sql = `select * from assets where path in ('${assetPaths.join("','")}')`
    const result = await kernelApi.sql({ stmt: sql })
    return result
}

