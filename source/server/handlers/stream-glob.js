
import { walkAsyncWithFdir,walkAsync } from '../processors/fs/walk.js'
import { buidStatFun } from '../processors/fs/stat.js'
import { Query } from '../../../static/mingo.js';
import { 准备缩略图 } from '../processors/thumbnail/loader.js'
const { pipeline } = require('stream');
/**
 * 创建一个walk流
 * @param {object} options 
 * @param {AbortSignal} signal 
 * @returns 
 */
const createWalkStream = (cwd, filter, signal, res, maxCount = 10000,walkController) => {
    let count = 0
    let preMatchCount = 0
    //因为遍历速度非常快,所以需要另行创建一个控制器避免提前结束响应
    //当signal触发中止时,walkController也中止
    signal.addEventListener('abort', () => {
        walkController.abort()
    })
    if (signal.aborted) {
        walkController.abort()
    }
    const walkSignal = walkController.signal
    const Transform = require('stream').Transform
    let filterFun
    if (filter) {
        console.log(filter)
        filterFun = (entry) => {
            if (filter) {
                if (walkController.aborted) {
                    return false
                }
                return filter.test(entry)
            }
        }
    } else {
        filterFun = undefined
    }

    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            walkAsyncWithFdir(cwd, filterFun, {
                ifFile:  (statProxy) => {
                    if (signal.aborted) {
                        this.push(null)
                        walkController.abort()
                        return
                    }
                    this.push(statProxy);
                },

                end: () => {
                    this.push(null);
                }
            }, true, walkSignal, maxCount);
            callback();
        }
    });
};
export const globStream = (req, res) => {
    const { Transform } = require('stream')
    const scheme = JSON.parse(req.query.setting)
    console.log(scheme)
    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    console.log(_filter)
    const walkController = new AbortController()
    const controller = new AbortController();
    let filter
    if (_filter ) {
        filter = {
            test: (statProxy) => {
                if (signal.aborted) {
                    walkController.abort()
                    return false
                }
                if (walkController.signal.aborted) {
                    return false
                }

                return statProxy.type !== 'file' || _filter.test(statProxy)
            }
        }
    } else {
        filter = _filter
    }
    const maxCount = scheme.maxCount
    console.log(maxCount)
    const cwd = scheme.cwd
    //设置响应头
    res.writeHead(200, {
        "Content-Type": "text/plain;charset=utf-8",
    });
    res.flushHeaders()
    res.write('')

    const { signal } = controller;
    const walkStream = createWalkStream(cwd, filter, signal, res, maxCount,walkController)

    //前端请求关闭时,触发中止信号
    //使用底层的链接关闭事件,因为nodejs的请求关闭事件在请求关闭时不会触发
    const socket = res.socket
    socket.on('close', () => {
        console.log('close')
        controller.abort();
    });
    let chunData = ''
    const transformStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            let that = this
            if (!signal.aborted) {

               setImmediate(() => {
                    try {
                        if (signal.aborted) {
                            callback()
                            return
                        }
                        const { name, path, type, size, mtime, mtimems, error } = chunk;
                        const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
                        chunData += data
                        res.flush()
                        callback()
                        准备缩略图(path)
                    } catch (err) {
                        console.warn(err, chunk);
                    }
                })
                this.push(chunData)
                res.flush()

                chunData = ''
                res.flush()

            } else {
                res.end()
                callback()
                return
            }
        }
    });
    walkStream.pipe(transformStream).pipe(res)
    walkStream.write({});  // 触发walk开始
};
export const fileListStream = async (req, res) => {
    console.log(req)
    const scheme = JSON.parse(req.query.setting)

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