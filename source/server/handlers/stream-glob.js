const fs = require('fs');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');
/**
 * 监听文件路径,有变化时进行处理
 */
function watchFile(filePath, encoding, callback) {
    fs.watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
            callback(filePath, filename, encoding, callback);
        }
    });
}
/**
 * 监听文件,有变化时更新缓存中的stat
 * 如果出错,说明文件被删除?删除缓存中的stat
 */
const statCache = new Map();
function watchFileStat(filePath) {
    const callback = (filePath, filename, encoding, callback) => {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                console.warn(err)
                statCache.delete(filePath);
            } else {
                statCache.set(filePath, stats);
            }
        });
    }
    try {
        watchFile(filePath, 'utf-8', callback);
    } catch (err) {
        console.warn(err, filePath)
        throw err
    }
}
/**
 * 
 * @param {*} filePath 
 * @param {*} encoding 
 * @param {*} callback 
 */
const appPath = require('@electron/remote').app.getPath('exe').replace(/\\/g, '/').replace(/\/\//g, '/').replace(/SiYuan.exe/g, '')
const appDisk=appPath.split(':')[0]
async function statWithCatch(filePath, encoding, callback,) {
    if (statCache.has(filePath)) {
        const stats = statCache.get(filePath);
        callback(null, JSON.stringify(stats) + '\n');
        return;
    }
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
        try{
            watchFileStat(filePath);
            statCache.set(filePath, fileInfo);
        }catch(err){
            statCache.delete(filePath);
            console.warn(err,filePath)
        }
        callback(null, JSON.stringify(fileInfo) + '\n');
    } catch (err) {
        /**
         * 这似乎是fast-glob的bug
         * 在windows下,如果路径中包含应用自身所在目录,fast-glob会将其视为相对路径,导致路径错误
         * 这里尝试将路径中的应用自身所在目录替换为应用所在目录
         * 目前未知其他系统是否有相同问题
         */
        try{
            filePath=filePath.replace(`${appDisk}:/`,appPath)
            const stats = await fs.promises.stat(filePath);
            const fileInfo = {
                path: filePath,
                id: `localEntrie_${filePath}`,
                type: 'local',
                size: stats.size,
                mtime: stats.mtime,
                mtimems: stats.mtime.getTime(),
            };
            try{
                watchFileStat(filePath);
                statCache.set(filePath, fileInfo);
            }catch(err){
                statCache.delete(filePath);
                console.warn(err,filePath)
            }
            callback(null, JSON.stringify(fileInfo) + '\n');    
            return
        }catch(err){
            console.warn(err,filePath)
        }
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
    const scheme = JSON.parse(req.query.setting)
    console.log(scheme)
    // 创建一个可读流，逐步读取文件路径
    // 创建一个 AbortController 实例
    try {
        scheme.pattern = scheme.pattern.replace(/\\/g, '/').replace(/\/\//g, '/')
    } catch (err) {
        console.warn(err, scheme)
        res.status(400).send('Invalid pattern')
        return;
    }
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