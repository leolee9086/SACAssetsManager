import { buildStepCallback } from './stat.js'
import { buildStatProxyByPath } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { statPromisesArray } from './disk/tree.js'
import { isEagleBackup, isEagleMeta, isEagleThumbnail, isWindowsysThumbnailDb } from '../thumbnail/utils/regexs.js'
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
const ignoreDir = ['$recycle', '$trash', '.git', '.sac','$RECYCLE.BIN','#recycle']
const 遍历缓存 = buildCache('walk')
export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, timeout, maxDepth) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    let count = 0
    let total = 0
    //构建目录树,这样下一次遍历的时候,可以跳过已经遍历过的目录
    
    try {
        console.log(遍历缓存.get(root))
        if (!遍历缓存.get(root)) {
            构建目录树(root)
        }
    } catch (e) {
        console.error('构建目录树失败', e)
    }
    
    const startTime = Date.now()
    const realFilter = async (path, isDir) => {
        total++
        countCallBack &&  countCallBack(total)

        statPromisesArray.paused = true
        const nowTime = Date.now()
        let modifydied = path.replace(/\\/g, '/')
        if (isEagleMeta(modifydied) || isEagleThumbnail(modifydied) || isWindowsysThumbnailDb(modifydied) || isEagleBackup(modifydied)) {
            return false
        }
        if (nowTime - startTime > timeout) {
            signal.walkController.abort()

            return false
        }

        if (signal.aborted) {
            console.log(signal,"aborted")

            return false
        }
        const entry = {
            isDirectory: () => isDir,
            isFile: () => !isDir,
            isSymbolicLink: () => false,
            name: path.split('/').pop()
        }
     
        let proxy = buildStatProxyByPath(modifydied, entry, isDir ? 'dir' : 'file')

        if (isDir) {
            try {
                if (!遍历缓存.get(proxy.path)) {
                    构建目录树(proxy.path)
                }
            } catch (e) {
                console.error('构建目录树失败', e)
            }
            try {
                let flag = filter ? await filter(proxy, proxy.path.split('/').length) : true

                return flag
            } catch (e) {
                console.error('filter失败', e)

                return false
            }
        }
      
      
        stepCallback && stepCallback.preMatch && stepCallback.preMatch(proxy)
        let result
        try {
            result = filter ? await filter(proxy, proxy.path.split('/').length) : true
        } catch (e) {            

            return false
        }
        result && stepCallback && proxy.type === 'file' && await stepCallback(proxy)
        result && count++

        return result
    }

    let api = new fdir()
        .withFullPaths()
        .exclude((name,path)=>{
            for  (let dir of ignoreDir) {
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
