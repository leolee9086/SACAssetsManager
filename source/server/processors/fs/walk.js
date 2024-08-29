import { 拼接文件名 } from './utils/JoinFilePath.js'
import { buildStepCallback } from './stat.js'
import { buildStatProxy, buildStatProxyByPath } from './stat.js'
import { fdir } from './fdirModified/index.js'

import { buildCache } from '../cache/cache.js'
import { diskTree } from './disk/tree.js'
const statCache = buildCache('statCache')
/**
 * 构建过滤函数
 * @param {function} filter 
 * @returns 
 */
function buildFilter(filter, signal) {
    if (!filter) {
        return null
    }
    if (filter && typeof filter === 'function') {
        return async (statProxy, depth) => {
            if (signal && signal.aborted) {
                return false
            }
            try {
                let proxy = new Proxy({}, {
                    get(target, prop) {
                        if (prop === 'depth') {
                            return depth
                        }
                        return statProxy[prop]
                    }
                })
                return await Promise.race([
                    filter(proxy),

                    new Promise((resolve, reject) => setTimeout(() => resolve(false), 30))
                ])
            } catch (e) {
                console.error(e, statProxy)
                return false
            }
        }
    } else {
        if (filter && typeof filter === 'object') {
            return async (statProxy, depth) => {
                if (signal && signal.aborted) {
                    return false
                }
                try {
                    let proxy = new Proxy({}, {
                        get(target, prop) {
                            if (prop === 'depth') {
                                return depth
                            }
                            return statProxy[prop]
                        }
                    })
                    const timeoutPromise = new Promise((resolve, reject) => setTimeout(() => resolve(false), 30))

                    if (statProxy.isFile() && filter.ifFile) {
                        return await Promise.race([filter.ifFile(proxy), timeoutPromise])
                    }
                    if (statProxy.isDirectory() && _filter.ifDir) {
                        return await Promise.race([filter.ifDir(proxy), timeoutPromise])

                    }
                    if (statProxy.isSymbolicLink() && _filter.ifLink) {
                        return await Promise.race([filter.ifLink(proxy), timeoutPromise])
                    }
                } catch (e) {
                    console.error(e, statProxy)
                    return false
                }
            }
        }
    }
}


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
const 缓存目录 = require('path').join(siyuanConfig.system.workspaceDir,'temp','sac', 'thumbnail').replace(/\\/g,'/')
const ignoreDir = [缓存目录,'$recycle','$trash','.git']
export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, maxCount, cachedCallback) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    let cached = []
    let count = 0
    let total = 0
   /* try {
     console.log(diskTree)
      cached = await diskTree.disks.find(d=>root.startsWith(d.root)).flatFiles.filter(async (fileItem) => {
            if (signal.aborted) {
                return false
            }
            if (total > maxCount) {
                signal.walkController.abort()
                return false
            }
            let flag = false
            for await (let dir of ignoreDir) {
                if (fileItem.path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
                    return false
                }
            }
            if (fileItem.path.startsWith(root)) {
                total++
                try{
                    flag = filter ? await filter(fileItem, fileItem.path.split('/').length) : true
                }catch(e){
                    return false
                }
            }
            if (flag) {
                count++
                stepCallback && stepCallback(fileItem)
            }
            return flag
        }, signal)
        cachedCallback && cachedCallback(cached)
    } catch (e) {
        console.error(e)
    }
    countCallBack && countCallBack(total)*/
    const realFilter = async (path, isDir) => {
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
        const entry = {
            isDirectory: () => isDir,
            isFile: () => !isDir,
            isSymbolicLink: () => false,
            name: path.split('/').pop()
        }
        let proxy = buildStatProxyByPath(path.replace(/\\/g,'/'), entry, isDir ? 'dir' : 'file')
        if (cached.find(proxy => proxy.path === path)) {
            console.log('cached',proxy.path)
            return false
        }
        if (isDir) {
            if (count > maxCount) {
                return false
            }
            try{
                let flag = filter ? await filter(proxy, proxy.path.split('/').length) : true
                return flag
            }catch(e){
                return false
            }
        }
        total++
        countCallBack && countCallBack(total)
        stepCallback && stepCallback.preMatch && stepCallback.preMatch(proxy)
        let result
        try{
            result= filter ? await filter(proxy, proxy.path.split('/').length) : true
        }catch(e){
            return false
        }
        
        result && stepCallback &&proxy.isFile&&stepCallback(proxy)
        result && count++
        return result
    }
    const api = new fdir()
        .withFullPaths()
        .withIdleCallback({ deadline: 50, timeout: 100 })
        .withSignal(signal)
        .withMaxFiles()
        .filter(realFilter)
        .crawl(root)
    const result = await api.withPromise()
    console.log('walkEnd')
    return result
}
