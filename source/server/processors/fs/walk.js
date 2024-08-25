import { 拼接文件名 } from './utils/JoinFilePath.js'
import { buildStepCallback } from './stat.js'
import { buildStatProxy, buildStatProxyByPath } from './stat.js'
import { fdir } from './fdirModified/index.js'

import { buildCache } from '../cache/cache.js'
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

                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15))
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
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15))

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
export async function walkAsyncWithFdir(root, _filter, _stepCallback, countCallBack, signal = { aborted: false }, maxCount, cachedCallback) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter = buildFilter(_filter, signal)
    let cached = []
    let count = 0
    let total = 0
    try {
      
      cached = await statCache.filter(async (proxy) => {
            if (signal.aborted) {
                return false
            }
            if (total > maxCount) {
                signal.walkController.abort()
                return false
            }
            countCallBack && countCallBack(total)
            let flag = false
            if (proxy.path.startsWith(root)) {
                total++

                try{
                    flag = filter ? await filter(proxy, proxy.path.split('/').length) : true
                }catch(e){
                    return false
                }
            }

            if (flag) {
                count++
                stepCallback && stepCallback(proxy)
            }
            return flag
        }, signal)
        cachedCallback && cachedCallback(cached)
    } catch (e) {
        console.error(e)
    }
    console.log('cached',cached)
    const realFilter = async (path, isDir) => {
        if (signal.aborted) {
            return false
        }
        if (total > maxCount) {
            signal.walkController.abort()
            return false
        }
        const entry = {
            isDirectory: () => isDir,
            isFile: () => !isDir,
            isSymbolicLink: () => false,
            name: path.split('/').pop()
        }
        let proxy = buildStatProxyByPath(path.replace(/\\/g,'/'), entry, isDir ? 'dir' : 'file')
        console.log(root,proxy.path)
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
        result && stepCallback && stepCallback(proxy)
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

export async function walkAsync(root, _filter, _stepCallback, useProxy = true, signal = { aborted: false }) {
    const files = [];
    const stepCallback = buildStepCallback(_stepCallback)
    console.log('stepCallback', stepCallback && stepCallback.preMatch)
    const filter = buildFilter(_filter, signal)
    async function readDir(dir, depth,) {
        if (signal.aborted) {
            stepCallback && stepCallback.end()
            return
        }
        let entries = []
        try {
            entries = readdirSyncWithCache(dir);
        } catch (error) {
            return
        }
        for await (let entry of entries) {
            if (signal.aborted) {
                stepCallback && stepCallback.end()
                return
            }
            const isDir = entry.isDirectory()
            if (isDir) {
                const statProxy = buildStatProxy(entry, dir, useProxy, 'dir')

                stepCallback && await stepCallback(statProxy)
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback && stepCallback.preMatch && await stepCallback.preMatch(statProxy)
                let filterResult = filter && (!filter(statProxy, depth));

                if (filterResult) {
                    continue
                } else {
                    if (signal.aborted) {
                        stepCallback && stepCallback.end()
                        return
                    }
                    await readDir(拼接文件名(dir, entry.name), depth + 1)
                }
            } else {
                const statProxy = buildStatProxy(entry, dir, useProxy, 'file')
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback && stepCallback.preMatch && await stepCallback.preMatch(statProxy)
                let filterResult = filter && (!filter(statProxy, depth));
                if (filterResult) {
                    continue
                } else {
                    files.push(statProxy)
                    stepCallback && await stepCallback(statProxy)
                }
            }
        }
    }
    await readDir(root, depth);
    console.log('walkEnd')
    stepCallback && stepCallback.end()
    return files;
}

