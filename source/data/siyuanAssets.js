import { cleanAssetPath } from "./utils/assetsName.js"
import { plugin } from '../asyncModules.js'
import { applyStmt,applyURIStreamJson } from './galleryDefine.js'
window[Symbol.for('$pathCache')]=window[Symbol.for('$pathCache')]||{}
export const pathCache =window[Symbol.for('$pathCache')]
export async function 获取tab附件数据(tab, limit, offset) {
    let query = `select * from assets limit ${limit || 100} offset ${offset || 0} `
    if (tab && tab.data && tab.data.block_id) {
        query = `select * from assets where docpath like '%${tab.data.block_id}%' limit ${limit || 100} offset ${offset || 0}  `
    } else if (tab && tab.data.box) {
        query = `select * from assets where box = '${tab.data.box}' limit ${limit || 100} offset ${offset || 0}  `
    } else if(tab && tab.data.type ==='sql'){
        query = tab.data.stmt
    }
    let data = await applyStmt({query})
    return data
}
export async function 获取本地文件夹数据(globSetting, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/glob-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`
    applyURIStreamJson(uri, target, callback, step, signal)
}