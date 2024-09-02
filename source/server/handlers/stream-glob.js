
import { walkAsyncWithFdir } from '../processors/fs/walk.js'
import { Query } from '../../../static/mingo.js';
import { 准备缩略图, diffFileColor } from '../processors/thumbnail/loader.js'
import { buildFileListStream } from '../processors/streams/fileList2Stats.js'
import { buildFilterStream } from '../processors/streams/withFilter.js';
import { stat2assetsItemStringLine } from './utils/responseType.js';
import { parseQuery } from './utils/requestType.js';
import { statPromisesArray } from '../processors/fs/disk/tree.js'
import { buildStatProxyByPath } from '../processors/fs/stat.js';
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
    let chunked = ''
    walkAsyncWithFdir(cwd, filterFun, {
        ifFile:  (statProxy) => {
            statPromisesArray.paused = true
            let data = stat2assetsItemStringLine(statProxy)
            chunked += data
            requestIdleCallback(() => {
                statPromisesArray.paused = true
                if (chunked) {
                    res.write(chunked)
                 //   res.flush()
                    chunked = ''
                }
            },{timeout:100,deadline:18})
        },
        end: () => {
            walkController.abort()
            statPromisesArray.paused = false
            if (chunked) {
                res.write(chunked)
                 //   res.flush()
                chunked = ''
            }

            res.flush()
            res.end();
        }
    }, (walkCount) => {
        chunked += `data:${JSON.stringify({ walkCount })}\n`
    }, walkSignal, maxCount);

};
export const globStream = async (req, res) => {
    console.log('globStream')
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
    const _filter = parseQuery({ req, res })
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
    if (scheme.queryPro && scheme.queryPro.color) {
        if (_filter) {
            filter.test = async (statProxy) => {
                if (signal.aborted) {
                    walkController.abort()
                    return false
                }
                if (_filter.test(statProxy)) {
                    return await diffFileColor(statProxy.path, scheme.queryPro.color)
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
                    return await diffFileColor(statProxy.path, scheme.queryPro.color)
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
   // res.flush()

    const { signal } = controller;
    createWalkStream(cwd, filter, signal, res, maxCount, walkController)
    //前端请求关闭时,触发中止信号
    //使用底层的链接关闭事件,因为nodejs的请求关闭事件在请求关闭时不会触发
    res.on('close', () => {
        console.log('close')
        statPromisesArray.paused = false

        controller.abort();
    });
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
    const _filter = scheme.query && JSON.stringify(scheme.query) !== '{}' ? new Query(scheme.query) : null
    const jsonParserStream = buildFileListStream()
    const filterStream = buildFilterStream(_filter)
    // 创建转换流，处理文件信息
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            let path = chunk.path
            this.push(stat2assetsItemStringLine(buildStatProxyByPath(path)))
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