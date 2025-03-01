import { kernelApi, plugin } from '../asyncModules.js'
import { applyURIStreamJson, applyURIStreamJsonCompatible, createCompatibleCallback } from './fetchStream.js'
import { queryTags } from './tags.js'
import { 转换笔记查询结果到附件项 } from './transform/toAssetItem.js'
import { 异步数组转存 } from '../utils/useEcma/array/pipe.js'
import { 按文档ID查询file链接, 查询块id数组 } from '../utils/sql/siyuanSentence.js'
import { applyStmt } from './galleryDefine.js'
import { 按笔记本查询附件, 查询所有附件, 按文档ID查询所有子文档附件 } from '../utils/sql/siyuanSentence.js'
export async function 获取本地文件夹数据(globSetting, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/glob-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, step, signal, globSetting.value)
}

async function 获取标签相关笔记(tagLabel) {
    let tagNotes = await kernelApi.fullTextSearchBlock({ query: `#${tagLabel}#` })
    let sql查询结果 = await kernelApi.sql({
        stmt: 查询块id数组(tagNotes.blocks.map(item => `"${item.id}"`))
    })
    return await 转换笔记查询结果到附件项(sql查询结果)
}
async function 获取标签相关文件(tag, globSetting, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/file-list-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, step, signal, { method: 'POST', body: tag.assets.join('\n') })
}
export async function 获取标签列表数据(tagLabel, target, callback, step, signal, globSetting) {
    let tag = await queryTags(tagLabel)
    let tagNotes = await 获取标签相关笔记(tagLabel)
    await 异步数组转存(tagNotes, target)
    await 获取标签相关文件(tag, globSetting, target, callback, step, signal)
}
export async function 获取本地文件列表数据(fileList, target, callback, step, signal) {
    let uri = `http://localhost:${plugin.http服务端口号}/file-list-stream`
    //  applyURIStreamJsonCompatible(uri, target, callback, step, signal)
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, step, signal, { method: 'POST', body: fileList.join('\n') })

}
export async function 获取颜色查询数据(color, target, callback, step = 1, signal, globSetting) {
    let uri = `http://localhost:${plugin.http服务端口号}/getPathseByColor?color=${encodeURIComponent(JSON.stringify(color))}`;
    const compatibleCallback = createCompatibleCallback(target, callback, step);
    await applyURIStreamJson(uri, compatibleCallback, 1, signal, globSetting);
}

export const 处理默认数据 = (tab, target, callback) => {
    以sql获取tab附件数据(tab, 102400).then(
        data => {
            return data.map(
                (item, index) => {
                    return {
                        ...item,
                        index
                    }
                }
            )
        }
    ).then(
        mapped => {
            mapped.forEach(item => {
                target.push(item);
                callback();
            });
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
export async function 获取文档中的文件链接(docId, limit = 100, offset = 0) {
    const query = 按文档ID查询file链接(docId, limit, offset)
    const result = await kernelApi.sql({ stmt: query })
    let lute = window.Lute.New()
    // 合并所有markdown文本为一个字符串
    let combinedMarkdown = result.map(row => row.markdown).join('\n')
    // 解析合并后的markdown为HTML
    const html = lute.Md2HTML(combinedMarkdown)
    // 创建一个DOM解析器
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    // 使用for循环获取所有链接
    const filePaths = []
    const links = doc.querySelectorAll('a[href^="file:///"]')
    for (let link of links) {
        const filePath = decodeURIComponent(link.getAttribute('href').replace('file:///', ''))
        filePaths.push(filePath)
    }
    return filePaths
}
export async function 以sql获取tab附件数据(tab, limit, offset) {
    const query = 获取查询语句(tab, limit, offset)
    return await applyStmt({ query })
}
