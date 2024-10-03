export const 查询块id数组 = (id数组) => {
    return `select * from blocks where id in (${id数组.join(',')})`
}
export const 按笔记本查询附件=(box,limit,offset)=>{
    return `select * from assets where box = '${box}' limit ${limit || 100} offset ${offset || 0}`
}
export const 查询所有附件=(limit, offset)=>{
    return `select * from assets limit ${limit || 100} offset ${offset || 0}`
}
export const 按文档ID查询所有子文档附件=(docId, limit, offset)=>{
    return `select * from assets where docpath like '%${docId}%' limit ${limit || 100} offset ${offset || 0}`
}
export const 按文档ID查询file链接=(docId, limit, offset)=>{
    return `
    SELECT *
    FROM spans
    WHERE type = "textmark a"
      AND markdown LIKE "%\]\(file\:\/\/\/%"
      AND root_id = "${docId}"
    LIMIT ${limit || 100} OFFSET ${offset || 0}
    `
}