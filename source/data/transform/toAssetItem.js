import { 修正路径分隔符号为正斜杠 } from '../../../src/utils/fs/fixPath.js';
import { 转换思源时间戳为毫秒 } from '../../../src/toolBox/useAge/forSiyuan/forTime/useConverters.js'

export async function 转换笔记查询结果到附件项(blocks) {
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
export async function 转换笔记附件查询结果到附件项(blocks) {
    let result = [];
    for await (let item of blocks) {
        result.push({
            ...item,
            id: item.id,
            box: item.box,
            hash:item.hash,
            type: 'note_asset',
            path: item.path,
            localPath:`${修正路径分隔符号为正斜杠(window.siyuan.config.system.workspaceDir+'/data'+'/'+item.path)}`,
            name: item.path,
            noteID:item.block_id,
            thumbnailURL:`/${item.path}`,
            $meta: item
        });
    }
    return result;
}
