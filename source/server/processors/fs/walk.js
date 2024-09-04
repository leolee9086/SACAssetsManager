import { buildStepCallback } from './stat.js'
import {  buildStatProxyByPath } from './stat.js'
import { buildFilter } from './builder-filter.js'
import { fdir } from './fdirModified/index.js'
import { buildCache } from '../cache/cache.js'
import { statPromisesArray } from './disk/tree.js'
import { isEagleBackup, isEagleMeta,isEagleThumbnail,isWindowsysThumbnailDb } from '../thumbnail/utils/regexs.js'
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
const ignoreDir = ['$recycle','$trash','.git','.sac']
const 遍历缓存 = buildCache('walk')
export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, maxCount, maxDepth) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    const startTime = new Date().getTime()
    let count = 0
    let total = 0
    const realFilter = async (path, isDir) => {
        statPromisesArray.paused = true
        const nowTime = new Date().getTime()
        if (nowTime - startTime > 3000) {
            signal.walkController.abort()
            return false
        }
        if (signal.aborted) {
            return false
        }
        if (total > maxCount) {
            signal.walkController.abort()

            return false
        }
        for await (let dir of ignoreDir) {
            if (path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
                return false
            }
        }
       
        if (isDir) {
            if (total > maxCount) {
                statPromisesArray.paused = false
                return false
            }
            try{
                let flag = filter ? await filter(proxy, proxy.path.split('/').length) : true

                return flag
            }catch(e){
                return false
            }
        } 
        const entry = {
            isDirectory: () => isDir,
            isFile: () => !isDir,
            isSymbolicLink: () => false,
            name: path.split('/').pop()
        }
        let modifydied = path.replace(/\\/g,'/')
        let proxy = buildStatProxyByPath(modifydied, entry, isDir ? 'dir' : 'file')
        if(isEagleMeta(modifydied)||isEagleThumbnail(modifydied)||isWindowsysThumbnailDb(modifydied)||isEagleBackup(modifydied)){
            return false
        }
    

        total++
        countCallBack &&await countCallBack(total)
        stepCallback && stepCallback.preMatch && stepCallback.preMatch(proxy)
        let result
        try{
            result= filter ? await filter(proxy, proxy.path.split('/').length) : true
        }catch(e){
            return false
        }
        result && stepCallback &&proxy.type==='file'&&await stepCallback(proxy)
        result && count++
        return result
    }

    let api = new fdir()
        .withFullPaths()
        .withSignal(signal)
        .withMaxFiles()
        .withCache(遍历缓存)
        .filter(realFilter)
    if(maxDepth){
        api=  api.withMaxDepth(maxDepth)
    }
    api= api.crawl(root)
    const result = await api.withPromise()
    return result
}
