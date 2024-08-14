const fs = require('fs');
const { Readable } = require('stream');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');
async function statWithCatch(filePath,encoding,callback){
    try {
        const stats = await fs.promises.stat(filePath);
        const fileInfo = {
            path: filePath,
            id: `localEntrie_${filePath}`,
            type: 'local',
            size: stats.size,
            mtime: stats.mtime,
            mtimems: stats.mtime.getTime(),
        };
        callback(null, JSON.stringify(fileInfo) + '\n');
    } catch (err) {
        console.warn(err)
        const fileInfo = {
            path: filePath,
            id: `localEntrie_${filePath}`,
            type: 'local',
            size: null,
            mtime: '',
            mtimems: '',
            error: err
        };
        callback(null, JSON.stringify(fileInfo) + '\n');
    }
}
export const globStream = async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    const scheme = JSON.parse(req.query.setting)
    // 创建一个可读流，逐步读取文件路径
    // 创建一个 AbortController 实例
    scheme.pattern = scheme.pattern.replace(/\\/g, '/').replace(/\/\//g, '/')
    const controller = new AbortController();
    const { signal } = controller;
    // 当请求关闭时，触发中止信号
    req.on('close', () => {
        controller.abort();
    });
    const fileStream = await fastGlob.stream(scheme.pattern, { ...scheme.options, suppressErrors: true, dot: false }, signal);
    // 使用管道将文件流通过一个转换流发送到响应中
    const transformStream = new (require('stream').Transform)({
        objectMode: true,
        transform: statWithCatch
    });
    pipeline(
        fileStream,
        transformStream,
        res,
        (err) => {
            if (err) {
                console.error('Streaming error:', err);
                res.destroy(err);
            } else {
                console.log('Streaming completed');
            }
        }
    );
}
export const fileListStream = async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    // 当请求关闭时，触发中止信号
    req.on('close', () => {
        controller.abort();
    });
    // 创建一个转换流，用于解析请求体中的JSON数据
    let buffer = '';
    const jsonParserStream = new (require('stream')).Transform({
        readableObjectMode: true,
        transform(chunk, encoding, callback) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            for (const line of lines) {
                try {
                    const file = line
                    this.push(file);
                } catch (err) {
                    console.warn('Invalid JSON:', line);
                }
            }
            callback();
        },
    });
    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform: statWithCatch
    });
    pipeline(
        req,
        jsonParserStream,
        transformStream,
        res,
        (err) => {
            if (err) {
                console.error('Streaming error:', err);
                res.destroy(err);
            } else {
                console.log('Streaming completed');
            }
        }
    );
}