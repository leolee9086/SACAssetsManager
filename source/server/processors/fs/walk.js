import { 拼接文件名 } from './utils/JoinFilePath.js'
import { buildStepCallback } from './stat.js'
import { buildStatProxy,buildStatProxyByPath } from './stat.js'
import { readDir } from '../../../polyfills/fs.js'
const fs = require('fs')


/**
 * 构建过滤函数
 * @param {function} filter 
 * @returns 
 */
function buildFilter(filter,signal) {
    if(!filter){
        return null
    }
    if (filter&&typeof filter === 'function') {
        return (statProxy, depth) => {
            if(signal&&signal.aborted){
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
                return filter(proxy)
            } catch (e) {
                console.error(e, statProxy)
                return false
            }
        }
    } else {
        if (filter&&typeof filter === 'object') {
            return  (statProxy, depth) => {
                if(signal&&signal.aborted){
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
                    if (statProxy.isFile() && filter.ifFile) {
                        return filter.ifFile(proxy)
                    }
                    if (statProxy.isDirectory() && _filter.ifDir) {
                        return filter.ifDir(proxy)
                    }
                    if (statProxy.isSymbolicLink() && _filter.ifLink) {
                        return filter.ifLink(proxy)
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
 * 按照给定路径,递归遍历所有文件和目录
 * 使用代理对象,避免重复读取
 * 每一步遍历都会执行stepCallback
 * 使用signal取消操作
 * @param {string} root //需要遍历的文件夹
 * @param {string} glob //需要匹配的文件名
 * @param {function} filter //匹配函数
 * @param {function|object{ifFile:function,ifDir:function,ifLink:function}} stepCallback 
 * @param {AbortSignal} signal 用于取消操作
 * @returns 
 */
export function walk(root, _filter, _stepCallback, useProxy = true, signal = { aborted: false }) {
    const files = [];
    const stepCallback = buildStepCallback(_stepCallback)
    console.log('stepCallback',stepCallback.preMatch)
    const filter = buildFilter(_filter,signal)
    let depth = 1
    function readDir(dir, depth) {
        if (signal.aborted) {
            stepCallback && stepCallback.end()
            return
        }
        depth++
        let entries = []
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
        }
        for (let entry of entries) {
            if (signal.aborted) {
                stepCallback && stepCallback.end()
                return
            }
            const isDir = entry.isDirectory()
            if (isDir) {
                const statProxy = buildStatProxy(entry, dir, useProxy,'dir')
                stepCallback && stepCallback(statProxy)
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                if (filter && !filter(statProxy, depth)) {
                    continue
                }
                readDir(拼接文件名(dir, entry.name), depth)
            } else {
                console.time('buildStatProxy')
                const statProxy = buildStatProxy(entry, dir, useProxy)
                console.timeEnd('buildStatProxy')
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback&&stepCallback.preMatch&& stepCallback.preMatch(statProxy)

                if (filter && !filter(statProxy, depth)) {
                    continue
                }
                files.push(statProxy)
                stepCallback && stepCallback(statProxy)
            }
        }
    }
    readDir(root, depth);
    stepCallback && stepCallback.end()
    return files;
}

const dirCache={}
const readdirSyncWithCache=(dir)=>{
    if(dirCache[dir]){
        return dirCache[dir]
    }
    dirCache[dir]=fs.readdirSync(dir, { withFileTypes: true });
    return dirCache[dir]
}
const {fdir} = require('fdir')

export async function walkAsync(root, _filter, _stepCallback, useProxy = true, signal = { aborted: false },maxCount) {
    const stepCallback = buildStepCallback(_stepCallback)
    const filter =buildFilter(_filter,signal)
    let count = 0
    const realFilter=(path,isDir)=>{
        if(signal.aborted){
            return false
        }
        if(count>maxCount){
            return false
        }
        const entry={
            isDirectory:()=>false,
            isFile:()=>true,
            isSymbolicLink:()=>false,
            name:path.split('/').pop()
        }
        let proxy = buildStatProxyByPath(path,entry,isDir?'dir':'file')
        if(isDir){
            if(count>maxCount){
                return false
            }
            return filter(proxy,path.split('/').length)
        }
        stepCallback&&stepCallback.preMatch&& stepCallback.preMatch(proxy)
        let result = filter?filter(proxy,path.split('/').length):true
        result&&stepCallback&&stepCallback(proxy)
        result&&count++
        return result
    }
    const api = new fdir().withFullPaths().withSignal(signal).withMaxFiles(maxCount).filter(realFilter).crawl(root)
    const result =  api.withPromise()
    return result
}

export async function _walkAsync(root, _filter, _stepCallback, useProxy = true, signal = { aborted: false }) {
    const files = [];
    const stepCallback = buildStepCallback(_stepCallback)
    console.log('stepCallback',stepCallback&&stepCallback.preMatch)
    const filter =buildFilter(_filter,signal)

    console.log('filter', _filter)
    
    
    
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
                const statProxy = buildStatProxy(entry, dir, useProxy,'dir')

                stepCallback && await stepCallback(statProxy)
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback&&stepCallback.preMatch&& await stepCallback.preMatch(statProxy)
                let filterResult = filter && (! filter(statProxy, depth));

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
                const statProxy = buildStatProxy(entry, dir, useProxy,'file')
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback&&stepCallback.preMatch&& await stepCallback.preMatch(statProxy)
                let filterResult = filter && (! filter(statProxy, depth));
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
    stepCallback && stepCallback.end()
    return files;

}
