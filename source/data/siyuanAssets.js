import { kernelApi, plugin } from '../asyncModules.js'
import { applyURIStreamJson,applyURIStreamJsonCompatible,createCompatibleCallback } from './fetchStream.js'
import {applyStmt}from './galleryDefine.js'
import  {getTagAssets, queryTags} from './tags.js'
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
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, step, signal, globSetting.value)
}
export async function 获取标签列表数据(tagLabel, target, callback, step, signal,globSetting) {
    let tag = await queryTags(tagLabel)
    console.log(tagLabel,tag,globSetting)
    let tagNotes = await kernelApi.fullTextSearchBlock({query:`#${tagLabel}#`})
    tagNotes=tagNotes.blocks.map(item=>
    {return{
        id:item.id,
        box:item.box,
        type:'note',
        created:item.created,
        updated:item.updated,
        path:item.path,
        name:item.content
    }}
    )
    for(let note of tagNotes){
        target.push(note)
    }
    let uri = `http://localhost:${plugin.http服务端口号}/file-list-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`
    applyURIStreamJsonCompatible(uri, target, callback, step, signal,{method:'POST',body:tag.assets.join('\n')},)
}
export async function 获取本地文件列表数据(fileList, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/file-list-stream?setting=${encodeURIComponent(JSON.stringify(fileList))}`
    applyURIStreamJsonCompatible(uri, target, callback, step, signal)
}