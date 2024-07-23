import { cleanAssetPath } from "./utils/assetsName.js"
export async function 获取tab附件数据(tab, limit, offset) {
    let query = `select * from assets limit ${limit || 100} offset ${offset || 0} `
    if (tab && tab.data && tab.data.block_id) {
        query = `select * from assets where docpath like '%${tab.data.block_id}%' limit ${limit || 100} offset ${offset || 0}  `
    } else if (tab && tab.data.box) {
        query = `select * from assets where box = '${tab.data.box}' limit ${limit || 100} offset ${offset || 0}  `
    }
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
export async function 获取本地文件夹数据(tab,layout,callback) {
    let { localPath } = tab.data

    fetch(`http://localhost/glob-stream?path=${localPath}\\`)
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
                        console.log('Stream complete');
                        return;
                    }
                    value.split('\n').forEach(chunk => {
                        try{
                            splitedChunk?layout.value.add(JSON.parse(splitedChunk+chunk)):layout.value.add(JSON.parse(chunk))
                            splitedChunk=undefined
                            callback()
                        }catch(e){
                            splitedChunk=chunk
                        }
                    });
                    
                    // 处理文件信息
                    // 继续读取
                    read();
                })
            }

        }).catch(error => { console.error(error) })
}