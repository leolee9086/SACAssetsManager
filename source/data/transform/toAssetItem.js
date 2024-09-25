import { 转换思源时间戳为毫秒 } from '../../utils/time/formatter.js'

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
