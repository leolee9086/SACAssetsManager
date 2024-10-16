
import { walkAsyncWithFdir } from '../processors/fs/walk.js'
import { Query } from '../../../static/mingo.js';
import { diffFileColor } from '../processors/thumbnail/loader.js'
import { buildFileListStream } from '../processors/streams/fileList2Stats.js'
import { buildFilterStream } from '../processors/streams/withFilter.js';
import { stat2assetsItemStringLine } from './utils/responseType.js';
import { parseQuery } from '../middlewares/ctx/parseQuery.js'
import { statPromisesArray } from '../../../trashed/tree.js'
import { statWithCatch } from '../processors/fs/stat.js';
import { buildCache } from '../processors/cache/cache.js';
import { reportHeartbeat } from '../utils/heartBeat.js';
const { pipeline } = require('stream');
/**
 * 创建一个walk流
 * @param {object} options 
 * @param {AbortSignal} signal 
 * @returns 
 */
const createWalkStream = (cwd, filter, signal, res, timeout = 3000, walkController, maxDepth, search, extensions) => {
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
    let chunked = ''
    walkAsyncWithFdir(cwd, filterFun, {
        ifFile: (statProxy) => {
            statPromisesArray.paused = true
            let data = stat2assetsItemStringLine(statProxy)
            reportHeartbeat()
            res.write(data)
        },
        end: () => {

            walkController.abort()
            statPromisesArray.paused = false
            if (chunked) {
                res.write(chunked)
                chunked = ''
            }
            res.end();
        }
    }, (walkCount) => {
        chunked += `data:${JSON.stringify({ walkCount })}\n`
        requestIdleCallback(() => {

            statPromisesArray.paused = true
            if (chunked) {
                res.write(chunked)
                chunked = ''
            }
        }, { timeout: 17, deadline: 18 })

    }, walkSignal, timeout, maxDepth, search, extensions);

};
export const globStream = (req, res) => {
    let fn = async () => {
        let scheme
        statPromisesArray.paused = true
        if (req.query && req.query.setting) {
            try {
                scheme = JSON.parse(req.query.setting)
            } catch (e) {
                console.error(e)
                throw (e)
            }
        } else if (req.body) {
            scheme = req.body
        }
        console.log('globStream', scheme)
        const _filter = parseQuery(req)
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
        const timeout = parseInt(scheme.timeout) || 1000
        const cwd = scheme.cwd
        //设置响应头
        res.writeHead(200, {
            "Content-Type": "text/plain;charset=utf-8",
        });
        //没有compression中间件的情况下,也就没有res.flush方法
        res.flushHeaders()
        const { signal } = controller;
        await createWalkStream(cwd, filter, signal, res, timeout, walkController, scheme.depth, scheme.search, scheme.extensions)
        statPromisesArray.start()
        //前端请求关闭时,触发中止信号
        //使用底层的链接关闭事件,因为nodejs的请求关闭事件在请求关闭时不会触发

        res.on('close', () => {
            reportHeartbeat()

            statPromisesArray.paused = false
        });
        return new Promise((resolve, reject) => {
            resolve({
                path: ""
            })
        })
    }
    fn.priority = 0
    statPromisesArray.push(fn)
    statPromisesArray.start(0, true)
};
export const fileListStream = async (req, res) => {
    const controller = new AbortController();
    let scheme = {}
    if (req.query && req.query.setting) {
        scheme = JSON.parse(req.query.setting)
    }
    req.on('close', () => {
        controller.abort();
    });
    let walkCount = buildCache('statCache').size
    res.write(`data:${JSON.stringify({ walkCount })}\n`)
    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    const jsonParserStream = buildFileListStream()
    const filterStream = buildFilterStream(_filter)
    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            (async () => {
                if (chunk&&chunk.path) {
                    let path = chunk.path
                    this.push(stat2assetsItemStringLine(await statWithCatch(path)))
                }
                callback()
            })()
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