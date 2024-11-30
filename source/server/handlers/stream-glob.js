import { walkAsyncWithFdir } from '../processors/fs/walk.js'
import { Query } from '../../../static/mingo.js';
import { buildFileListStream } from '../processors/streams/fileList2Stats.js'
import { buildFilterStream } from '../processors/streams/withFilter.js';
import { stat2assetsItemStringLine } from './utils/responseType.js';
import { parseQuery } from '../middlewares/ctx/parseQuery.js'
import { globalTaskQueue } from '../middlewares/runtime_queue.js';
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
// 处理信号和控制器的设置
const setupWalkController = (signal, walkController) => {
    signal.addEventListener('abort', () => {
        walkController.abort()
    })
    if (signal.aborted) {
        walkController.abort()
    }
    const walkSignal = walkController.signal
    walkSignal.walkController = walkController
    return walkSignal
}

// 创建过滤函数
const createFilterFunction = (filter, walkController) => {
    if (!filter) return undefined
    return (entry) => {
        if (walkController.aborted) {
            return false
        }
        return filter.test(entry)
    }
}

// 创建文件处理回调
const createFileHandler = (res) => (statProxy) => {
    globalTaskQueue.paused = true
    let data = stat2assetsItemStringLine(statProxy)
    reportHeartbeat()
    res.write(data)
}

// 创建结束处理回调
const createEndHandler = (walkController, res, chunkedRef) => () => {
    walkController.abort()
    globalTaskQueue.paused = false
    if (chunkedRef.value) {
        res.write(chunkedRef.value)
        chunkedRef.value = ''
    }
    res.end()
}

// 创建进度处理回调
const createProgressHandler = (res, chunkedRef) => (walkCount) => {
    chunkedRef.value += `data:${JSON.stringify({ walkCount })}\n`
    requestIdleCallback(() => {
        globalTaskQueue.paused = true
        if (chunkedRef.value) {
            res.write(chunkedRef.value)
            chunkedRef.value = ''
        }
    }, { timeout: 17, deadline: 18 })
}

const createWalkStream = (cwd, filter, signal, res, timeout = 3000, walkController, maxDepth, search, extensions) => {
    const walkSignal = setupWalkController(signal, walkController)
    const filterFun = createFilterFunction(filter, walkController)
    
    // 使用对象引用来共享chunked状态
    const chunkedRef = { value: '' }
    
    walkAsyncWithFdir(
        cwd, 
        filterFun,
        {
            ifFile: createFileHandler(res),
            end: createEndHandler(walkController, res, chunkedRef)
        },
        createProgressHandler(res, chunkedRef),
        walkSignal,
        timeout,
        maxDepth,
        search,
        extensions
    )
}

// 1. 解析遍历配置
const parseStreamConfig = (req) => {
    let scheme
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
    return scheme
}
// 2. 创建过滤器
const 创建流过滤器 = (_filter, signal, walkController) => {
    if (!_filter) return _filter
    return {
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
}
export const globStream = (req, res) => {
    let fn = async () => {
        globalTaskQueue.paused = true
        let scheme = parseStreamConfig(req)
        console.log('globStream', scheme)
        const _filter = parseQuery(req)
        const walkController = new AbortController()
        const controller = new AbortController();
        const { signal } = controller;

        let filter = 创建流过滤器(_filter, signal, walkController)
        const timeout = parseInt(scheme.timeout) || 1000
        const cwd = scheme.cwd
        //设置响应头
        res.writeHead(200, {
            "Content-Type": "text/plain;charset=utf-8",
        });
        //没有compression中间件的情况下,也就没有res.flush方法
        res.flushHeaders()
        await createWalkStream(cwd, filter, signal, res, timeout, walkController, scheme.depth, scheme.search, scheme.extensions)
        res.on('close', () => {
            reportHeartbeat()

            globalTaskQueue.paused = false
        });
        return new Promise((resolve, reject) => {
            resolve({
                path: ""
            })
        })
    }
    fn.priority = 0
    globalTaskQueue.push(fn)
    globalTaskQueue.start(0, true)
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