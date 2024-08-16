
import { walk } from '../processors/fs/walk.js'
import { watchFile } from '../processors/fs/watch.js'
const fs = require('fs');
const fastGlob = require('fast-glob');
const { pipeline } = require('stream');
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
const appDisk = appPath.split(':')[0]
function buidStatFun(cwd) {
    cwd && (cwd = cwd.replace(/\\/g, '/').replace(/\/\//g, '/'));
    return async function statWithCatch(filePath, encoding, callback,) {
        cwd && (filePath = cwd + filePath);
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
            try {
                watchFileStat(filePath);
                statCache.set(filePath, fileInfo);
            } catch (err) {
                statCache.delete(filePath);
                console.warn(err, filePath)
            }
            callback(null, JSON.stringify(fileInfo) + '\n');
        } catch (err) {
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
}
/**
 * 为了避免背压过大,使用流式写入时,需要手动控制写入速度
 * @param {*} req 
 * @param {*} res 
 * 
 */
function writeWithinSpeed(res, speed = 100) {

    const cache = []
    return function (chunk, encoding, callback) {
        cache.push(chunk)
        if (cache.length >= speed) {
            console.log('writeWithinSpeed', cache.length)
            res.write(cache.join('\n'), encoding, callback)
            cache.length = 0
        }
    }
}

export const globStream = async (req, res) => {
    const { pipeline, Transform } = require('stream')
    const scheme = JSON.parse(req.query.setting);
    const options = scheme.options;

    res.writeHead(200, { 'Content-Type': 'application/text;charset=utf-8' });

    const transformStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            try {
                if(Array.isArray(chunk)){
                    const stringifyData=[]
                    for(const item of chunk){
                        const { name, path, type, size, mtime, mtimems, error } = item;
                        const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
                        stringifyData.push(data)
                    }
                    this.push(stringifyData.join(''));
                }else{
                    const { name, path, type, size, mtime, mtimems, error } = chunk;
                    const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
                    this.push(data);
    
                }
            } catch (err) {
                console.warn(err, chunk);
            }
            callback();
        }
    });
    const chunkSize = 10
    let chunkData=[]
    const walkStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            walk(options.cwd, null, null, {
                ifFile: (statProxy) => {
    
                    if(chunkData.length<chunkSize){
                        chunkData.push(statProxy)
                    }
                    else{
                        this.push(chunkData);
                        chunkData=[]
                    }
                },
                end: () => {
                    this.push(chunkData);
                    this.push(null);
                }
            }, false);
            callback();
        }
    });

    pipeline(
        walkStream,
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

    walkStream.write({});  // 触发walk开始
};



export const $$globStream = async (req, res) => {
    const scheme = JSON.parse(req.query.setting);
    const options = scheme.options;
    const cache = [];
    let paused = false;

    res.writeHead(200, { 'Content-Type': 'application/text;charset=utf-8' });
    res.write('\n')
    // 监听drain事件来恢复写入
    res.on('drain', () => {
        paused = false;
        processCache();
    });
    /**
     * 写入缓存中的数据
     * 如果已经结束遍历,需要保证写入所有缓存中的数据
     */
    const processCache = (ended = false) => {
        if (ended) {
            while (cache.length > 0) {
                //写入数据直到缓存为空

                const data = cache.shift();
                if (!res.write(data)) {
                    cache.push(data);
                    paused = true;
                    setTimeout(processCache);
                    break;
                }
            }
            if (cache.length === 0) {
                res.end();
            }
        }
        while (cache.length > 0 && !paused) {
            const data = cache.shift();
            if (!res.write(data)) {
                cache.push(data);
                paused = true;
                break;
            }
        }
    };

    const callbacks = {
        ifFile: (statProxy) => {
            try {
                const { name, path, type, size, mtime, mtimems, error } = statProxy;
                const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';

                if (paused) {
                    cache.push(data);
                } else if (!res.write(data)) {
                    paused = true;
                    cache.push(data);
                }
            } catch (err) {
                console.warn(err, statProxy)
            }
        },
        end: () => {
            console.log('end');
            /**
             * 写入缓存中的数据
             */
            processCache(true);
        }
    };

    walk(options.cwd, null, null, callbacks, false);
};
export const __globStream = async (req, res) => {
    const scheme = JSON.parse(req.query.setting)
    const controller = new AbortController();
    const { signal } = controller;
    const pattern = scheme.pattern
    const options = scheme.options
    console.log(res)
    const stream = new require('stream').Readable({ objectMode: true, read: () => { } })
    res.writeHead(200, { 'Content-Type': 'application/text;charset=utf-8' });
    const callbacks = {
        ifFile: (statProxy) => {
            const { name, path, type, size, mtime, mtimems, error } = statProxy
            //流式写入
            console.log('callbacks', name, type, size, mtime, mtimems, error)
            try {
                //    stream.push(JSON.stringify({name,type,size,mtime,mtimems,error})+'\n')
                res.write(JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n')
            } catch (e) {
                console.warn(e)
            }
        },
        end: () => {
            console.log('end')
            res.end()
        }
    }
    await walk(options.cwd, null, null, callbacks, false)
    //  stream.pipe(res)
}
export const $globStream = async (req, res) => {
    const scheme = JSON.parse(req.query.setting)
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
    //查找包含"刘江"的文件
    const fileStream = fastGlob.stream(scheme.pattern, { ...scheme.options, suppressErrors: true, dot: false }, signal);
    // 使用管道将文件流通过一个转换流发送到响应中
    const transformStream = new (require('stream').Transform)({
        objectMode: true,
        transform: buidStatFun(scheme.options.cwd)
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
        transform: buidStatFun(scheme.options.cwd)
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