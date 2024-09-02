import { 拼接文件名 } from './utils/JoinFilePath.js'
import { buildCache } from '../cache/cache.js'
const statCache = buildCache('statCache')

/**
 * 根据stat计算hash
 */
const { createHash } = require('crypto');

export const genStatHash = (stat) => {
    // 创建一个hash对象，使用MD5算法
    const hash = createHash('md5');
  
    // 直接向hash对象添加数据，减少字符串拼接
    hash.update(stat.path);
    hash.update(stat.size.toString());
    hash.update(stat.mtime.getTime().toString());
  
    // 生成哈希值，并截取前8个字符，以提高性能
    const hashValue = hash.digest().toString('hex').substring(0, 8);
  
    // 使用文件名（去掉扩展名）和哈希值生成最终的哈希字符串
    const name = stat.path.split('/').pop().replace(/\./g, '_');
    return `${name}_${hashValue}`;
  }
/**
 * 如果stepCallback是一个函数,直接使用它
 * 如果stepCallback是一个对象,使用它的两个回调函数分别构建
 * @param {*} stepCallback 
 * @returns 
 */
export const buildStepCallback = (stepCallback) => {
    if (!stepCallback) return
    if (typeof stepCallback === 'function') {
        let callback = async (statProxy) => {
            try {
                await stepCallback(statProxy)
            } catch (e) {
                console.error(e)
            }
        }
        callback.end = async () => {
            stepCallback && stepCallback.end && await stepCallback.end()
        }
        return callback
    }
    let callback = async (statProxy) => {
        try {
            if (statProxy.type === 'dir') {
                stepCallback.ifDir && await stepCallback.ifDir(statProxy)
            }
            if (statProxy.type === 'file') {
                stepCallback.ifFile && await stepCallback.ifFile(statProxy)
            }
            if (statProxy.type === 'symbolicLink') {
                stepCallback.ifSymbolicLink && await stepCallback.ifSymbolicLink(statProxy)
            }
        } catch (e) {
            console.warn(e)
        }
    }
    stepCallback && stepCallback.preMatch && (callback.preMatch = async () => {
        await stepCallback.preMatch()
    });
    callback.end = async () => {
        stepCallback && stepCallback.end && await stepCallback.end()
    }
    return callback
}



const fs = require('fs')
export const statWithCatch = (path) => {
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');

    try {
        if (statCache.get(path)) {
            return statCache.get(path)
        }
        let stat = fs.statSync(path)
        statCache.set(path, {
            name: path.split('/').pop(),
            path,
            type: stat.isFile() ? 'file' : 'dir',
            ...stat,
        })
        console.log(stat)
        return statCache.get(path)
    } catch (e) {
        return {
            name: path.split('/').pop(),
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
export const buildStatProxy = (entry, dir, useProxy, type) => {
    let path = 拼接文件名(dir, entry.name).replace(/\\/g,'/')
    if (useProxy) {
        let proxy = buildStatProxyByPath(path, entry, type)
        return proxy
    } else {
        let stats = statWithCatch(path.replace(/\\/g,'/'))
        return stats
    }
}
export const buildStatProxyByPath = (path, entry, type) => {
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    entry =  statWithCatch(path.replace(/\\/g,'/'))
    return entry
}
