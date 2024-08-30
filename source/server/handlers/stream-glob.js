
import { walkAsyncWithFdir } from '../processors/fs/walk.js'
import { buildStatProxyByPath } from '../processors/fs/stat.js'
import { Query } from '../../../static/mingo.js';
import { 准备缩略图, 生成缩略图 } from '../processors/thumbnail/loader.js'
import { genThumbnailColor } from '../processors/thumbnail/loader.js'
import { diffColor } from '../processors/color/Kmeans.js'
import { buildFileListStream } from '../processors/streams/fileList2Stats.js'
import { buildFilterStream } from '../processors/streams/withFilter.js';
const { pipeline } = require('stream');
/**
 * 创建一个walk流
 * @param {object} options 
 * @param {AbortSignal} signal 
 * @returns 
 */
const createWalkStream = (cwd, filter, signal, res, maxCount = 10000, walkController) => {
    //因为遍历速度非常快,所以需要另行创建一个控制器避免提前结束响应
    //当signal触发中止时,walkController也中止
    signal.addEventListener('abort', () => {
        walkController.abort()
    })
    if (signal.aborted) {
        walkController.abort()
    }
    const walkSignal = walkController.signal
    walkSignal.walkController = walkController
    let filterFun
    if (filter) {
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
    let chunked = []
    walkAsyncWithFdir(cwd, filterFun, {
        ifFile: async (statProxy) => {
            const { name, path, type, size, mtime, mtimems, error } = statProxy;
           const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
           
           res.write(`data:${data}\n`)
            res.flush()
           准备缩略图(path)
        },
        end: () => {
            res.end();
        }
    }, (walkCount) => {
        res.write(`data:${JSON.stringify({ walkCount })}\n`)
        res.flush()
    }, walkSignal, maxCount);
    
};
export const globStream = async (req, res) => {
    let scheme = {}
    if (req.query && req.query) {
        scheme = JSON.parse(req.query.setting)
    }

    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    const walkController = new AbortController()
    const controller = new AbortController();
    let filter
    if (_filter) {
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
   if (scheme.queryPro&&scheme.queryPro.color) {
        if (_filter) {
            filter.test = async (statProxy) => {
                if (signal.aborted) {
                    walkController.abort()
                    return false
                }
                if (_filter.test(statProxy)) {
                   
                    let simiColor = await genThumbnailColor(statProxy.path)
                    for await (let item of simiColor) {
                        if (diffColor(item.color === scheme.queryPro.color)) {
                            return true
                        }
                    }
                    return false

                }
                return false
            }
        } else {
            filter = {
                test: async (statProxy) => {
                    if (signal.aborted) {
                        walkController.abort()
                        return false
                    }
                   
                    let simiColor = await genThumbnailColor(statProxy.path)
                    for await (let item of simiColor) {
                        if (diffColor(item.color, scheme.queryPro.color)) {
                            return true
                        }
                    }
                    return false
                }
            }
        }
    }
    const maxCount = scheme.maxCount
    const cwd = scheme.cwd
    //设置响应头
    res.writeHead(200, {
        "Content-Type": "text/plain;charset=utf-8",
    });
    res.flushHeaders()
    res.write('')
    const { signal } = controller;
    createWalkStream(cwd, filter, signal, res, maxCount, walkController)
    //前端请求关闭时,触发中止信号
    //使用底层的链接关闭事件,因为nodejs的请求关闭事件在请求关闭时不会触发
    res.on('close', () => {
        console.log('close')
        controller.abort();
    });
};
export const fileListStream = async (req, res) => {
    const controller = new AbortController();
    let scheme = {}
    if (req.query && req.query.setting) {
        scheme = JSON.parse(req.query.setting)
    }
    console.log(scheme)
    // 当请求关闭时，触发中止信号
    req.on('close', () => {
        controller.abort();
    });
    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    const jsonParserStream= buildFileListStream()
    const filterStream =buildFilterStream(_filter)
    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            const { name, path, type, size, mtime, mtimems, error } = chunk;
            const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
            this.push(`data:${data}\n`)
            res.flush()
            callback()
        }
    });
    pipeline(
        req,
        jsonParserStream,
        filterStream,
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