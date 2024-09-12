import { 删除文件颜色记录 } from '../color/colorIndex.js';
import { 写入缩略图缓存行, 删除缩略图缓存行, 查找并解析文件状态, 查找文件hash, 查找文件状态, 计算哈希 } from '../thumbnail/indexer.js';

/**
 * 根据stat计算hash
 */

export const 获取哈希并写入数据库 = async (stat, retryConut = 0) => {
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
export const statWithNew =async(path)=>{
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    try {
         fs.stat(path,async(error,stat)=>{
            if(error){
                console.error(error)
                return
            }
            let result = await 查找并解析文件状态(path)
            if(result&&result.updateTime>new Date(stat.mtime).getTime()-5000){
                console.log('时间不足')
                return
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
            await 写入缩略图缓存行(path, Date.now(), stat)
        
         })

    } catch (e) {
        console.warn('获取文件状态失败', path, e)
        return undefined
    }
}
export const statWithCatch = async (path) => {
    path = path.replace(/\\/g, '/').replace(/\/\//g, '/');
    const start = Date.now()
    try {
        let result = await 查找并解析文件状态(path)
        if (result) {
            return result
        }
        else {
            let stat
            try {
                stat = await fs.promises.stat(path)
            } catch (e) {
                console.warn('获取文件状态失败', path, e)
                if(e.message.indexOf('no such file or directory')){
                    console.log('文件不存在,删除颜色记录',删除文件颜色记录(path))
                    console.log('文件不存在,删除数据库记录',删除缩略图缓存行(path))
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
            await 写入缩略图缓存行(path, Date.now(), stat)
            const result = await 查找并解析文件状态(path)
            //  console.log("statWithCatchNew",result)
            console.log("statWithCatchNew", Date.now() - start, result)

            return result
        }
    } catch (e) {
        console.error(e)
        return
    }
}
