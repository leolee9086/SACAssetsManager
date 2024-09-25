import { applyStmt } from "../../../data/galleryDefine.js"
import { 按笔记本查询附件,查询所有附件,按文档ID查询所有子文档附件 } from "../../../utils/sql/siyuanSentence.js"
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


function 获取查询语句(tab, limit, offset) {
    if (tab && tab.data) {
        if (tab.data.block_id) {
            return 按文档ID查询所有子文档附件(tab.data.block_id, limit, offset)
        } else if (tab.data.box) {
            return 按笔记本查询附件(tab.data.box, limit, offset)
        } else if (tab.data.type === 'sql') {
            return tab.data.stmt
        }
    }
    return 查询所有附件(limit, offset)
}

export async function 以sql获取tab附件数据(tab, limit, offset) {
    const query = 获取查询语句(tab, limit, offset)
    return await applyStmt({query})
}