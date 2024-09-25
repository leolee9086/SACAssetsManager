import { applyStmt } from "../../../data/galleryDefine.js"
export const  处理默认数据=(tab,target,callback)=>{
    以sql获取tab附件数据(tab, 102400).then(
        data=>{return data.map(
            (item, index) => {
                return {
                    ...item,
                    index
                }
            }
        )}
    ).then(
        mapped=>{
            console.log(mapped)
            target.push(...mapped)
            callback()
        }
    )
}
function 构建基础查询(limit, offset) {
    return `select * from assets limit ${limit || 100} offset ${offset || 0}`
}

function 构建按块ID查询(blockId, limit, offset) {
    return `select * from assets where docpath like '%${blockId}%' limit ${limit || 100} offset ${offset || 0}`
}

function 构建按笔记本查询(box, limit, offset) {
    return `select * from assets where box = '${box}' limit ${limit || 100} offset ${offset || 0}`
}

function 获取查询语句(tab, limit, offset) {
    if (tab && tab.data) {
        if (tab.data.block_id) {
            return 构建按块ID查询(tab.data.block_id, limit, offset)
        } else if (tab.data.box) {
            return 构建按笔记本查询(tab.data.box, limit, offset)
        } else if (tab.data.type === 'sql') {
            return tab.data.stmt
        }
    }
    return 构建基础查询(limit, offset)
}

export async function 以sql获取tab附件数据(tab, limit, offset) {
    const query = 获取查询语句(tab, limit, offset)
    return await applyStmt({query})
}