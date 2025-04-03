import { 删除文件颜色记录 } from '../color/colorIndex.js';
import { globalTaskQueue } from '../queue/taskQueue.js';
import { 写入缩略图缓存行, 删除缩略图缓存行, 查找并解析文件状态, 查找文件hash, 查找文件状态, 计算哈希 } from '../thumbnail/indexer.js';

/**
 * 根据stat计算hash
 */

export const 获取哈希并写入数据库 = async (stat, retryConut = 0) => {
    if(!stat){
        throw new Error('stat不能为空')
    }
    let 数据库查询结果 = await 查找文件hash(stat.path)
    if (!数据库查询结果) {
        retryConut += 1
        console.log('发现新的文件条目,尝试写入重试次数', retryConut)
        if (retryConut >= 10) {
            throw new Error('执行获取哈希并写入数据库失败,请检查')
        }
        // 创建一个hash对象，使用MD5算法
        // 使用文件名（去掉扩展名）和哈希值生成最终的哈希字符串
        await 写入缩略图缓存行(stat.path, Date.now(), stat)
        return await 获取哈希并写入数据库(stat, retryConut)
    }
    else {
        if (数据库查询结果.length > 1) {
            throw ('发现重复索引')
        }
        console.log(数据库查询结果)
        return `${数据库查询结果.fullName.split('/').pop().replace(/\./g, '_')}_${数据库查询结果.statHash}`
    }
}
/**
 * 如果stepCallback是一个函数,直接使用它
 * 如果stepCallback是一个对象,使用它的两个回调函数分别构建
 * @param {*} stepCallback 
 * @returns 
 */
export const buildStepCallback = (stepCallback) => {
    if (!stepCallback) return () => {
        return true
    }
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
    let empty = () => { return true }
    let map = {
        dir: stepCallback.ifDir || empty,
        file: stepCallback.ifFile || empty,
        symbolicLink: stepCallback.ifSymbolicLink || empty,
        error: empty
    }
    let callback = async (statProxy) => {
        try {
            await map[statProxy.type](statProxy)
        } catch (e) {
            console.warn(e, statProxy)
        }
    }

    callback.end = async () => {
        stepCallback && stepCallback.end && await stepCallback.end()
    }
    return callback
}



const fs = require('fs')

export const statWithNew = async (path) => {
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    try {
        if (! fs.existsSync(path)) {
            console.log('文件不存在',path)
            删除文件颜色记录(path);
            删除缩略图缓存行(path);
            return;
        }
        try {
            const stat = await fs.promises.stat(path);
            stat.name = path.split('/').pop();
            stat.path = path;
            if (stat.isFile()) {
                stat.type = 'file';
            }
            if (stat.isDirectory()) {
                stat.type = 'dir';
            }
            if (stat.isSymbolicLink()) {
                stat.type = 'link';
            }
            await 写入缩略图缓存行(path, Date.now(), stat);
        } catch (error) {
            console.error(error);
        }
    } catch (e) {
        console.warn('获取文件状态失败', path, e);
    }
}
/**
 * 获取文件或目录的状态信息
 * @param {string} path - 文件或目录路径
 * @param {Object} options - 配置选项
 * @param {Function} options.onError - 错误处理回调函数
 * @param {Function} options.onSuccess - 成功处理回调函数
 * @returns {Promise<Object|null>} 文件状态信息
 */
export const statWithCatch = async (path, options = {}) => {
    const { onError, onSuccess } = options;
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    const start = Date.now()
    console.log('[statWithCatch] 开始处理文件:', path);
    
    try {
        let result = await 查找并解析文件状态(path)
        if (result) {
            console.log('[statWithCatch] 从缓存中找到文件状态:', result);
            if (onSuccess) {
                onSuccess(result);
            }
            return result
        }
        else {
            console.log('[statWithCatch] 缓存未命中,尝试从文件系统获取状态');
            let stat
            try {
                stat = await fs.promises.stat(path)
                console.log('[statWithCatch] 成功获取文件状态:', stat);
            } catch (e) {
                console.warn('[statWithCatch] 获取文件状态失败:', path, e)
                if (e.message.indexOf('no such file or directory')) {
                    console.log('[statWithCatch] 文件不存在,将删除颜色记录和数据库记录')
                    globalTaskQueue.push(
                        async () => {
                            删除文件颜色记录(path)
                            删除缩略图缓存行(path)
                            return path
                        }
                    )
                }
                if (onError) {
                    onError(e);
                }
                return undefined
            }
            stat.name = path.split('/').pop()
            stat.path = path
            if (stat.isFile()) {
                stat.type = 'file'
            }
            if (stat.isDirectory()) {
                stat.type = 'dir'
            }
            if (stat.isSymbolicLink()) {
                stat.type = 'link'
            }
            console.log('[statWithCatch] 写入缓存:', stat);
            await 写入缩略图缓存行(path, Date.now(), stat)
            const result = await 查找并解析文件状态(path)
            console.log("[statWithCatch] 处理完成,耗时:", Date.now() - start, "结果:", result)
            
            if (onSuccess) {
                onSuccess(result);
            }
            
            return result
        }
    } catch (e) {
        console.error('[statWithCatch] 发生错误:', e)
        if (onError) {
            onError(e);
        }
        return
    }
}
