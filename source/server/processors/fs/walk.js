import { 拼接文件名 } from './utils/JoinFilePath.js'
import { buildStepCallback } from './stat.js'
import { buildStatProxy } from './stat.js'
const fs = require('fs')


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