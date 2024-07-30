const fs = require('fs');
const { Readable } = require('stream');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');

export const globStream= async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    const scheme = JSON.parse(req.query.setting)
    // 创建一个可读流，逐步读取文件路径
       // 创建一个 AbortController 实例
       console.log(scheme)
       const controller = new AbortController();
       const { signal } = controller;
       // 当请求关闭时，触发中止信号
       req.on('close', () => {
           controller.abort();
       });
    const fileStream =await fastGlob.stream(scheme.pattern,{...scheme.options,suppressErrors:true,dot:false},signal);
    // 使用管道将文件流通过一个转换流发送到响应中
    const transformStream = new (require('stream').Transform)({
        objectMode: true,
        async transform(file, encoding, callback) {
            try {
                const stats = await fs.promises.stat(file);
                const fileInfo = {
                    path: file,
                    id:`localEntrie_${file}`,
                    type:'local',
                    size: stats.size,
                    mtime:stats.mtime,
                    mtimems: stats.mtime.getTime(),
                  };
                callback(null, JSON.stringify(fileInfo)+'\n');
            } catch (err) {
                console.warn(err)
                const fileInfo = {
                    path: file,
                    id:`localEntrie_${file}`,
                    type:'local',
                    size: null,
                    mtime: '',
                    mtimems:'',
                    error:err
                  };
                callback(null,JSON.stringify(fileInfo)+'\n');
            }
        }
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

    // 创建一个 AbortController 实例
    const controller = new AbortController();
    const { signal } = controller;

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
            console.log(lines)
            for (const line of lines) {
                try {
                    const file = line
                    console.log(file)
                    this.push(file);
                } catch (err) {
                    console.warn('Invalid JSON:', line);
                }
            }
            callback();
        },
        /*flush(callback) {
            if (buffer) {
                try {
                    const file = buffer
                    this.push(file);
                } catch (err) {
                    console.warn('Invalid JSON:', buffer);
                }
            }
            callback();
        }*/
    });

    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        async transform(file, encoding, callback) {
            console.log(file)
            try {
                const stats = await fs.promises.stat(file);
                const fileInfo = {
                    path: file,
                    id: `localEntrie_${file}`,
                    type: 'local',
                    size: stats.size,
                    mtime: stats.mtime,
                    mtimems: stats.mtime.getTime(),
                };
                callback(null, JSON.stringify(fileInfo) + '\n');
            } catch (err) {
                console.warn(err);
                const fileInfo = {
                    path: file,
                    id: `localEntrie_${file}`,
                    type: 'local',
                    size: null,
                    mtime: '',
                    mtimems: '',
                    error: err.message,
                };
                callback(null, JSON.stringify(fileInfo) + '\n');
            }
        }
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