import { buildStepCallback } from './stat.js'
import { buildStatProxyByPath } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { statPromisesArray } from './disk/tree.js'
import { isMetaData, isThumbnail } from '../thumbnail/utils/regexs.js'
import { 构建目录树 } from '../fs/disk/tree.js'
import { ignoreDir } from './dirs/ignored.js'
import { globalTaskQueue } from '../queue/taskQueue.js'
import { reportHeartbeat } from '../../utils/heartBeat.js'
/**
 * 使用修改后的fdir,遍历指定目录
 * @param {*} root 
 * @param {*} _filter 
 * @param {*} _stepCallback 
 * @param {*} useProxy 
 * @param {*} signal 
 * @param {*} maxCount 
 * @returns 
 */
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')

export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, timeout, maxDepth=Infinity) {
    console.log(maxDepth)
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    let total = 0
    //构建目录树,这样下一次遍历的时候,可以跳过已经遍历过的目录
    初始化目录树(root)
    const startTime = Date.now()
    const realFilter = async (path, isDir) => {
        statPromisesArray.paused = true
        const nowTime = Date.now()
        reportHeartbeat()
        let modifydied = path.replace(/\\/g, '/')
        if (isDir) {
            handleDirectory(modifydied, nowTime)
            return false
        }
        if (isThumbnail(path) || isMetaData(path)) {
            total++
            return false
        }
        if(shouldAbort(startTime, timeout, signal)){
            return false
        }
        let proxy = buildStatProxyByPath(modifydied)
        let result
        total++
        countCallBack && countCallBack(total)

        try {
            result = await filter(proxy)
        } catch (e) {
            console.error(e)
            return false
        }
        result && stepCallback(proxy)
        return result
    }
    let api = new fdir()
        .withFullPaths()
        .exclude((name, path) => {
            for (let dir of ignoreDir) {
                if (path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
                    return true
                }
            }
            return false
        })
        .withSignal(signal)
        .withMaxDepth(maxDepth)
        .withCache(遍历缓存)
        .filter(realFilter)
    if (maxDepth) {
        api = api.withMaxDepth(maxDepth)
    }
    api = api.crawl(root)
    const result = await api.withPromise()
    return result
}

async function 初始化目录树(root) {
    try {
        if (!遍历缓存.get(root)) {
            构建目录树(root)
        }
    } catch (e) {
        console.error('构建目录树失败', e)
    }
}
function shouldAbort(startTime, timeout, signal) {
    const nowTime = Date.now()
    if (nowTime - startTime > timeout) {
        signal.walkController.abort()
        return true
    }
    return signal.aborted
}
async function handleDirectory(path, nowTime) {
    globalTaskQueue.push(async () => {
        try {
            if (!遍历缓存.get(path)) {
                globalTaskQueue.push(
                    globalTaskQueue.priority(
                        async () => {
                            构建目录树(path)
                            return path
                        }, 0 - nowTime)
                )
            }
        } catch (e) {
            console.error('构建目录树失败', e)
        }
        return path
    })
    return false
}
