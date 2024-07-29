import { cleanAssetPath } from "./utils/assetsName.js"
import { plugin } from '../asyncModules.js'
import { applyStmt } from './galleryDefine.js'
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
    let _step = 0
    fetch(`http://localhost:${plugin.http服务端口号}/glob-stream?setting=${encodeURIComponent(JSON.stringify(globSetting))}`, { signal })
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