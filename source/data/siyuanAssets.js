import { cleanAssetPath } from "./utils/assetsName.js"
export async function 获取tab附件数据(tab, limit, offset) {
    let query = `select * from assets limit ${limit || 100} offset ${offset || 0} `
   /* if (tab&&tab.data && tab.data.block_id) {
        query = `select * from assets where docpath like '%${tab.data.block_id}%' limit ${limit || 100} offset ${offset || 0}  `
    } else if (tab&&tab.data.box) {
        query = `select * from assets where box = '${tab.data.box}' limit ${limit || 100} offset ${offset || 0}  `
    }*/
    const json = await fetch('/api/query/sql', {
        method: "POST",
        body: JSON.stringify({
            stmt: query// 获取前300个
        })
    })
        .then(data => data.json())
    let mock = await json.data
    //mock=mock.concat(mock).concat(mock).concat(mock).concat(mock).concat(mock)
    let data = mock.map(
        (item, i) => {
            return {
                index: i,
                format: item.path.split('.').pop(),
                cleanPath: cleanAssetPath(item.path),
                ...item
            }
        }
    )
    return data
}
