import { buildStatProxyByPath } from '../fs/stat.js'
export const buildFileListStream = () => {
    // 创建一个转换流，用于解析请求体中的JSON数据
    let buffer = '';
    const jsonParserStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            buffer += chunk.toString();
            const lines = buffer.split('\n').filter(
                item => item
            )
            for (const line of lines) {
                try {
                    const statProxy = buildStatProxyByPath(line)
                    this.push(statProxy);
                } catch (err) {
                    console.warn('Invalid JSON:', line, err);
                }
            }
            callback();
        },
    });
    return jsonParserStream
}