import { kernelApi } from "../asyncModules.js";
import mingo from '../../static/mingo.js'
import { cleanAssetPath } from "./utils/assetsName.js";
function loadFilters(galleryDefine) {
    return galleryDefine.filters.map(
        item => {
            return {
                name: item.name,
                describe: item.describe,
                fn: (content) => {
                    return mingo.filter(content, item.filter)
                }
            }
        }
    )
}
function loadBreadCrumb(galleryDefine){
    return galleryDefine.breadCrumb
}
function loadGetter(galleryDefine) {
    switch (galleryDefine.type) {
        case 'siyuanSql':
            let stmt = galleryDefine.getter.stmt;
            return applyStmt(stmt);
        case 'glob':
            return galleryDefine.getter.getter;
        case 'url':
            return galleryDefine.getter.getter;
        default:
            return galleryDefine.content
    }
}
function loadSorters(galleryDefine) {
    return galleryDefine.sorters.map(
        item => {
            return {
                name: item.name,
                describe: item.describe,
                fn: (content) => {
                    return content.sort(item.sorter)
                }
            }
        }
    )
}

/***
 * 获取使用的函数
 *
 */
function siyuanSqlParser(query, params) {
    return query.replace(/\?/g, (match) => {
        return params.shift(); // 从参数数组中取出第一个元素并替换占位符
    });
}
export  async function applyStmt(stmt) {
    let query = stmt.query;
    let params = stmt.params;
    let sql = query;
    if (params) {
        sql = siyuanSqlParser(query, params)
    }
    let data =  await kernelApi.sql(
        {
            stmt: sql,
        }
    )
    return data.map(
        (item, i) => {
            return {
                index: i,
                format: item.path.split('.').pop(),
                cleanPath: cleanAssetPath(item.path),
                path: item.path,
                ...item
            }
        }
    )
}
export async function applyURIStreamJson(uri, target, callback, step, signal) {
    let _step = 0;
    fetch(uri, { signal })
    .then(response => {
        if (response.ok) {
            // 获取响应的可读流
            const reader = response.body.getReader();
            return new ReadableStream({
                start(controller) {
                    function push() {
                        reader.read().then(({ value, done }) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            // 将每个文件信息推送到流中
                            controller.enqueue(new TextDecoder('utf-8').decode(value));
                            push(); // 继续读取下一部分
                        });
                    }
                    push();
                }
            });
        } else {
            throw new Error('Network response was not ok.');
        }
    })
    .then(stream => {
        // 使用流式处理读取数据
        const reader = stream.getReader();
        read()
        let splitedChunk
        function read() {
            reader.read().then(({ value, done }) => {
                if (done) {
                    callback && callback()
                    console.log('Stream complete');
                    return;
                }
                value.split('\n').forEach(chunk => {
                    try {
                        splitedChunk ? target.push(JSON.parse(splitedChunk + chunk)) : target.push(JSON.parse(chunk))
                        _step += 1
                        if (_step >= step) {
                            callback && callback()
                            _step = 0
                        }
                        splitedChunk = undefined
                    } catch (e) {
                        splitedChunk = chunk
                    }
                });
                // 处理文件信息
                // 继续读取
                read();
            })
        }
    }).catch(error => { console.error(error) })

}
