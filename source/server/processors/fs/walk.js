import { 拼接文件名 } from './utils/JoinFilePath.js'
import { buildStepCallback } from './stat.js'
const fs = require('fs')
/**
 * 每个函数单独实现,避免多功能函数
 * 以保证简单性和功能单一
 * @param {*} root 
 * @returns 
 */
const cache = {}
const statWithCatch = (path) => {
    try {
        if (cache[path]) {
       
            return cache[path]
        }
        cache[path] = fs.statSync(path)
        return cache[path]
    } catch (e) {
        return {
            path,
            isDirectory: () => false,
            isFile: () => false,
            isSymbolicLink: () => false,
            error: e,
            mode: 0,
            size: 0,
            atime: new Date(),
            mtime: new Date(),
            birthtime: new Date()
        }
    }
}

/**
 * 创建一个代理对象,只有获取value时才会懒执行,节约性能
 * 使用缓存,避免重复读取
 */
const buildStatProxy = (entry, dir, useProxy) => {
    return new Proxy({}, {
        get(target, prop) {
            if (prop === 'name') {
                return 拼接文件名(dir, entry.name)
            }
            if (prop === 'isDirectory') {
                return entry.isDirectory()
            }
            if (prop === 'isFile') {
                return entry.isFile()
            }
            if (prop === 'isSymbolicLink') {
                return entry.isSymbolicLink()
            }
            const stats = cache[拼接文件名(dir, entry.name)] || statWithCatch(拼接文件名(dir, entry.name))
            if (prop === 'toString') {
                const { path, id, type, size, mtime, mtimems, error } = stats
                return JSON.stringify({ path, id, type, size, mtime, mtimems, error })
            }

            if (prop === 'type') {
                //type是文件类型,dir表示目录,file表示文件,link表示符号链接
                if (entry.isDirectory()) {
                    return 'dir'
                }
                if (entry.isFile()) {
                    return 'file'
                }
                if (entry.isSymbolicLink()) {
                    return 'link'
                }
            }
            if (prop === 'path') {
                let normalizedPath = 拼接文件名(dir, entry.name)
                normalizedPath = normalizedPath.replace(/\/\//g, '/')
                return normalizedPath
            }
            cache[拼接文件名(dir, entry.name)] = stats
            return stats[prop]
        }
    })
}

/**
 * 构建过滤函数
 * @param {function} filter 
 * @returns 
 */
function buildFilter(filter) {
    if (typeof filter === 'function') {
        return (statProxy, depth) => {
            try {
                let proxy = new Proxy({}, {
                    get(target, prop) {
                        if (prop === 'depth') {
                            console.log('depth',depth)
                            return depth
                        }
                        return statProxy[prop]
                    }
                })
                console.log(filter,filter(proxy))
                return filter(proxy)

            } catch (e) {
                console.error(e, statProxy)
                return false
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
    const filter = buildFilter(_filter)
    console.log('filter',_filter)
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
                stepCallback && stepCallback(buildStatProxy(entry, dir, useProxy))
                if (filter && !filter(buildStatProxy(entry, dir, useProxy), depth)) {
                    continue
                }

                readDir(拼接文件名(dir, entry.name), depth)
            } else {
                const statProxy = buildStatProxy(entry, dir, useProxy)
                if (filter && !filter(buildStatProxy(entry, dir, useProxy), depth)) {
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



const globFileCache = {}

export async function walkAsync(root, _filter, _stepCallback, useProxy = true, signal = { aborted: false }) {
    const files = [];
    const stepCallback = buildStepCallback(_stepCallback)
    let depth = 1
    const filter = buildFilter(_filter)
    async function readDir(dir, depth,) {
        if (signal.aborted) {
            stepCallback && stepCallback.end()
            return
        }
        let entries = []
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
            console.error(error)
        }
        for await (let entry of entries) {
            if (signal.aborted) {
                stepCallback && stepCallback.end()
                return
            }
            const isDir = entry.isDirectory()
            if (isDir) {
                stepCallback && stepCallback(buildStatProxy(entry, dir, useProxy))
                if (filter && !filter(buildStatProxy(entry, dir, useProxy), depth)) {
                    continue
                } else {
                    await readDir(拼接文件名(dir, entry.name), depth + 1)
                }
            } else {
                const statProxy = buildStatProxy(entry, dir, useProxy)
                if (filter && !filter(buildStatProxy(entry, dir, useProxy), depth)) {
                    continue
                } else {
                    files.push(statProxy)
                    stepCallback && stepCallback(statProxy)
                }
            }
        }
    }
    await readDir(root, depth);
    stepCallback && stepCallback.end()
    return files;

}