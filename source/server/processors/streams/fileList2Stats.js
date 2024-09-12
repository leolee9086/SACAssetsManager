import { statWithCatch } from '../fs/stat.js'
export const buildFileListStream = () => {
    // 创建一个转换流，用于解析请求体中的JSON数据
    let buffer = '';
    const jsonParserStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            (async () => {
                buffer += chunk.toString();
                const lines = buffer.split('\n').filter(
                    item => item
                )
                for (const line of lines) {
                    try {
                        const statProxy = await statWithCatch(line)
                        this.push(statProxy);
                    } catch (err) {
                        console.warn('Invalid JSON:', line, err);
                    }
                }
                callback();
            })()
        },
    });
    return jsonParserStream
}