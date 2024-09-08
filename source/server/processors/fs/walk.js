import { buildStepCallback } from './stat.js'
import { buildStatProxyByPath } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { statPromisesArray } from './disk/tree.js'
import { isMetaData,isThumbnail } from '../thumbnail/utils/regexs.js'
import { 构建目录树 } from '../fs/disk/tree.js'
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
const ignoreDir = ['$recycle', '$trash', '.git', '.sac', '$RECYCLE.BIN', '#recycle', '.pnpm-store']
const 遍历缓存 = buildCache('walk')
const statCache = buildCache('statCache')

export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, timeout, maxDepth) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    let total = 0
    //构建目录树,这样下一次遍历的时候,可以跳过已经遍历过的目录
    try {
        if (!遍历缓存.get(root)) {
            构建目录树(root)
        }
    } catch (e) {
        console.error('构建目录树失败', e)
    }
    const startTime = Date.now()
    const realFilter = async (path, isDir) => {
        if (isDir) {
            return false
        }
        statPromisesArray.paused = true
        const nowTime = Date.now()
        let modifydied = path.replace(/\\/g, '/')
        if(isThumbnail(path)||isMetaData(path)){
            total++ 
            return false
        }
        if (nowTime - startTime > timeout) {
            signal.walkController.abort()
            return false
        }
        if (signal.aborted) {
            return false
        }
        let proxy = buildStatProxyByPath(modifydied)
        let result
        total++
        try {
            result = await filter(proxy, proxy.path.split('/').length)
        } catch (e) {
            return false
        }
        countCallBack &&  countCallBack(total)
        result &&   stepCallback(proxy)
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
        .withCache(遍历缓存)
        .filter(realFilter)
    if (maxDepth) {
        api = api.withMaxDepth(maxDepth)
    }
    api = api.crawl(root)
    const result = await api.withPromise()
    return result
}
