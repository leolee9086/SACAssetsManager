import { Query } from '../../../static/mingo.js';
import { buildFileListStream } from '../processors/streams/fileList2Stats.js'
import { buildFilterStream } from '../processors/streams/withFilter.js';
import { stat2assetsItemStringLine } from './utils/responseType.js';
import { parseQuery } from '../middlewares/ctx/parseQuery.js'
import { globalTaskQueue } from '../middlewares/runtime_queue.js';
import { statWithCatch } from '../processors/fs/stat.js';
import { buildCache } from '../processors/cache/cache.js';
import { reportHeartbeat } from '../../../src/toolBox/base/useElectron/useHeartBeat.js';
import { 查找子文件夹,流式查找子文件夹 } from '../processors/thumbnail/indexer.js'
import { 更新目录索引,processWalkResults,调度文件夹索引任务 } from '../processors/fs/walk.js'
import { 日志 } from '../../../src/toolBox/base/useEcma/forLogs/useLogger.js';
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





const createWalk = async (cwd, filter, signal, res, timeout = 3000, walkController, maxDepth, search, extensions) => {
    const walkSignal = setupWalkController(signal, walkController)
    const filterFun = createFilterFunction(filter, walkController)
    const chunkedRef = { value: '' }
    
    // 获取子文件夹信息
    const { results, approximateCount } = await 查找子文件夹(cwd, search, extensions)
    
    // 创建回调函数
    const progressHandler = createProgressHandler(res, chunkedRef)
    const fileHandler = createFileHandler(res)
    const endHandler = createEndHandler(walkController, res, chunkedRef)
    
    // 报告初始计数
    progressHandler(approximateCount)
    
    // 处理遍历结果
    const stats = await processWalkResults(
        results,
        filterFun,
        fileHandler
    )
    
    // 安排目录索引更新
    调度文件夹索引任务(cwd, stats, walkSignal)
    // 处理结束
    endHandler()
}
const createWalkStream = async (cwd, filter, signal, res, timeout = 3000, walkController, maxDepth, search, extensions) => {
    const walkSignal = setupWalkController(signal, walkController)
    const filterFun = createFilterFunction(filter, walkController)
    const chunkedRef = { value: '' }
    
    // 创建回调函数
    const progressHandler = createProgressHandler(res, chunkedRef)
    const fileHandler = createFileHandler(res)
    const endHandler = createEndHandler(walkController, res, chunkedRef)
    
    let walkCount = 0
    const stats = []
    
    // 使用流式查找并处理结果
    for await (const result of 流式查找子文件夹(cwd, search, extensions)) {
        if (walkSignal.aborted) break
        
        walkCount++
        // 每处理100个文件更新一次进度
        if (walkCount % 100 === 0) {
            progressHandler(walkCount)
        }
        
        // 应用过滤器
        if (!filterFun || filterFun(result)) {
            stats.push(result)
            fileHandler(result)
        }
    }
    
    // 最后一次进度更新
    progressHandler(walkCount)
    
    // 安排目录索引更新
    调度文件夹索引任务(cwd, stats, walkSignal)
    // 处理结束
    endHandler()
}


// 1. 解析遍历配置
const parseStreamConfig = (req) => {
    let scheme
    if (req.query && req.query.setting) {
        try {
            scheme = JSON.parse(req.query.setting)
        } catch (e) {
            日志.错误(e, 'StreamGlob');
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
            //这里疑似错误地将文件夹也包含了
            //return statProxy.type !== 'file' || _filter.test(statProxy)
            return _filter.test(statProxy)
        }
    }
}
export const globStream = (req, res) => {
    let fn = async () => {
        globalTaskQueue.paused = true
        let scheme = parseStreamConfig(req)
        日志.信息(`开始globStream: ${JSON.stringify(scheme)}`, 'StreamGlob');
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
            日志.信息('globStream完成', 'StreamGlob');
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
    日志.信息(`开始fileListStream: ${JSON.stringify(scheme)}`, 'StreamGlob');
    req.on('close', () => {
        controller.abort();
        日志.信息('fileListStream已关闭', 'StreamGlob');
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
                日志.错误(`流处理错误: ${err}`, 'StreamGlob');
                res.destroy(err);
            } else {
                日志.信息('流处理完成', 'StreamGlob');
            }
        }
    );
}