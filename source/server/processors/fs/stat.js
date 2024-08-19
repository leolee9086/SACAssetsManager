import { 拼接文件名 } from './utils/JoinFilePath.js'
/**
 * 如果stepCallback是一个函数,直接使用它
 * 如果stepCallback是一个对象,使用它的两个回调函数分别构建
 * @param {*} stepCallback 
 * @returns 
 */
export const buildStepCallback = (stepCallback) => {
    if (!stepCallback) return
    if (typeof stepCallback === 'function') {
        let callback = (statProxy) => {
            try {
                stepCallback(statProxy)
            } catch (e) {
                console.error(e)
            }
        }
        callback.end = () => {
            stepCallback.end && stepCallback.end()
        }
        return callback
    }
    let callback = (statProxy) => {
        try {
            if (statProxy.isDirectory) {
                stepCallback.ifDir && stepCallback.ifDir(statProxy)
            }
            if (statProxy.isFile) {
                stepCallback.ifFile && stepCallback.ifFile(statProxy)
            }
            if (statProxy.isSymbolicLink) {
                stepCallback.ifSymbolicLink && stepCallback.ifSymbolicLink(statProxy)
            }
        } catch (e) {
            console.warn(e)
        }
    }
    callback.end = () => {
        stepCallback.end && stepCallback.end()
    }
    return callback
}




/**
 * 
 * @param {*} filePath 
 * @param {*} encoding 
 * @param {*} callback 
 */
export function buidStatFun(cwd) {
    const fs = require('fs')
    cwd && (cwd = cwd.replace(/\\/g, '/').replace(/\/\//g, '/'));
    return async function statWithCatch(filePath, encoding, callback,) {
        cwd && (filePath = cwd + filePath);
        if (statCache.has(filePath)) {
            const stats = statCache.get(filePath);
            callback(null, JSON.stringify(stats) + '\n');
            return;
        }
        try {
            const stats = await fs.promises.stat(filePath);
            const fileInfo = {
                path: filePath,
                id: `localEntrie_${filePath}`,
                type: 'local',
                size: stats.size,
                mtime: stats.mtime,
                mtimems: stats.mtime.getTime(),
            };
            try {
                watchFileStat(filePath);
                statCache.set(filePath, fileInfo);
            } catch (err) {
                statCache.delete(filePath);
                console.warn(err, filePath)
            }
            callback(null, JSON.stringify(fileInfo) + '\n');
        } catch (err) {
            const fileInfo = {
                path: filePath,
                id: `localEntrie_${filePath}`,
                type: 'local',
                size: null,
                mtime: '',
                mtimems: '',
                error: err
            };
            callback(null, JSON.stringify(fileInfo) + '\n');
        }
    }
}


import { buildCache } from '../cache/cache.js'
const statCache = buildCache('statCache')
const fs = require('fs')
export  const statWithCatch = (path) => {
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    try {
        if (statCache[path]) {
            return statCache.get(path)
        }
        let stat =fs.statSync(path)
        statCache.set(path, {
            path,
            type: stat.isFile()?'file':'dir',
            ...stat,
            ...fs.lstatSync(path)
        })
        return statCache.get(path)
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
export const buildStatProxy = (entry, dir, useProxy) => {
    let path =拼接文件名(dir, entry.name)
    if(useProxy){
        return buildStatProxyByPath(path,entry)
    }else{
        let stats = statWithCatch(path)
        let type = stats.type
        return {
            name:entry.name,
            type,
            path,
            ...stats,
            isDirectory:()=>entry.isDirectory(),
            isFile:()=>entry.isFile(),
            isSymbolicLink:()=>entry.isSymbolicLink(),
        }
    }
}
export const buildStatProxyByPath = (path,entry) => {
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    //这里的entry需要与fs.readdirSync(path)返回的entry一致
    //否则会导致statWithCatch缓存失效
    //设法让entry与fs.readdirSync(path)返回的entry一致
    //不能使用lstatSync,因为lstatSync返回的entry没有isDirectory等方法
    entry = entry||fs.statSync(path)

    return new Proxy({}, {
        get(target, prop) {
            if (prop === 'name') {
                return path
            }
            if (prop === 'isDirectory') {
                return entry&&entry.isDirectory()
            }
            if (prop === 'isFile') {
                return entry&&entry.isFile()

            }
            if (prop === 'isSymbolicLink') {
                return entry&&entry.isSymbolicLink()

            }
            const stats = statWithCatch(path)
            if (prop === 'toString') {
                const { path, id, type, size, mtime, mtimems, error } = stats
                return JSON.stringify({ path, id, type, size, mtime, mtimems, error })
            }
            if (prop === 'type') {
                //type是文件类型,dir表示目录,file表示文件,link表示符号链接
                if (entry&&entry.isDirectory()) {
                    return 'dir'
                }
                if (entry&&entry.isFile()) {

                    return 'file'
                }
                if (entry&&entry.isSymbolicLink()) {
                    return 'link'
                }
                return 'file'
            }
            if (prop === 'path') {
                return path
            }
            return stats[prop]
        }
    })

}
