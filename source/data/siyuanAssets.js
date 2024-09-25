import { kernelApi, plugin } from '../asyncModules.js'
import { applyURIStreamJson, applyURIStreamJsonCompatible, createCompatibleCallback } from './fetchStream.js'
import { queryTags } from './tags.js'
import { 转换思源时间戳为毫秒 } from '../utils/time/formatter.js'
export async function 获取本地文件夹数据(globSetting, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/glob-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, step, signal, globSetting.value)
}

async function 转换笔记查询结果到附件项(blocks) {
    let result = [];
    for await (let item of blocks) {
        result.push({
            id: item.id,
            box: item.box,
            type: 'note',
            ctimeMs: 转换思源时间戳为毫秒(item.created),
            mtimeMs: 转换思源时间戳为毫秒(item.updated),
            path: item.path,
            name: item.content,
            $meta: item
        });
    }
    return result;
}

async function 获取标签相关笔记(tagLabel) {
    let tagNotes = await kernelApi.fullTextSearchBlock({ query: `#${tagLabel}#` })
    let sql查询结果 = await kernelApi.sql({
        stmt: `select * from blocks where id in (${tagNotes.blocks.map(item => `"${item.id}"`).join(',')})`
    })
    return await 转换笔记查询结果到附件项(sql查询结果)
}

async function 处理标签相关笔记(tagNotes, target) {
    for (let note of tagNotes) {
        target.push(note)
    }
}

async function 获取标签相关文件(tag, globSetting, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/file-list-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, step, signal, { method: 'POST', body: tag.assets.join('\n') })
}

export async function 获取标签列表数据(tagLabel, target, callback, step, signal, globSetting) {
    let tag = await queryTags(tagLabel)
    let tagNotes = await 获取标签相关笔记(tagLabel)
    await 处理标签相关笔记(tagNotes, target)
    await 获取标签相关文件(tag, globSetting, target, callback, step, signal)
}
export async function 获取本地文件列表数据(fileList, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/file-list-stream?setting=${encodeURIComponent(JSON.stringify(fileList))}`
    applyURIStreamJsonCompatible(uri, target, callback, step, signal)
}