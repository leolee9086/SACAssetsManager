import { sendFileWithCacheSet } from "../handlers/utils/responseType.js"
import { getCachePath } from "../processors/fs/cached/fs.js"
import { buildCache } from "../processors/cache/cache.js"
import { statWithCatch } from "../processors/fs/stat.js"
import { 获取哈希并写入数据库 } from "../processors/fs/stat.js"
import { statPromisesArray } from "../processors/fs/disk/tree.js"
import { 生成缩略图 } from "../processors/thumbnail/loader.js"
export const sendDefaultIcon = (req, res) => {
    const iconPath = process.execPath.replace('SiYuan.exe', 'resources\\stage\\icon-large.png')
    res.sendFile(iconPath)
    return
}
export const 默认图片响应 = async (req, res, next) => {
    sendDefaultIcon(req, res)
    next()
}

export const getSourcePath = (req, res, next) => {
    const path = require('path')
    let 源文件地址 = ''
    if (req.query.localPath) {
        源文件地址 = req.query.localPath
    } else {
        源文件地址 = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    源文件地址 = 源文件地址.replace(/\//g, '\\')
    req.sourcePath = 源文件地址
    next()
}

export const 文件缩略图内存缓存中间件 = async (req, res, next) => {
    const 源文件地址 = req.sourcePath
    const stat = await statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    let cacheResult = thumbnailCache.get(缓存键)
    console.log(`查找文件缩略图内存缓存`,源文件地址)
    if (cacheResult && Buffer.isBuffer(cacheResult)) {
        console.log(`文件缩略图内存缓存命中`,源文件地址)
        res.send(cacheResult)
        statPromisesArray.paused = false;
        return
    }
    next()
}
export const 生成默认缩略图路径=async(path)=>{
    const stat = await statWithCatch(path)
    const hashedName =await 获取哈希并写入数据库(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(path, 'thumbnails', true)).cachePath
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    return 缓存路径

}    
export const checkAndSendWritedIconWithCacheWrite = async (req, res, next) => {
    const 源文件地址 = req.sourcePath
    const stat = await statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    const hashedName =await 获取哈希并写入数据库(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(源文件地址, 'thumbnails', true)).cachePath
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    console.log(缓存路径)
    // 先检查是否存在缓存的缩略图
    console.log(`查找文件缩略图硬盘缓存`,缓存路径)
    if (await sendFileWithCacheSet(res, 缓存路径, thumbnailCache, 缓存键)) {
        console.log(`文件缩略图硬盘缓存命中`,源文件地址)
        statPromisesArray.paused = false;
        return
    }
    next()
}


export const 生成缩略图响应 = async (req, res, next) => {
    console.log(`未找到文件缩略图，生成文件缩略图`,req.sourcePath)
    genThumbnail(req, res, next);
    statPromisesArray.paused = false
    return 
}



let cacheLoader = (ctx) => {
    let { 缓存对象, 缓存键, 缓存时间 } = ctx.stats
    let result = 缓存对象.get(缓存键)
    if (result) {
        return result
    }
}
const getThumbnailWithCache = async (ctx) => {
    statPromisesArray.paused = true
    let { 源文件地址, 缓存键 } = ctx.stats
    let result = null
    let cacheResult = cacheLoader(ctx)
    if (cacheResult) {
        result = cacheResult
    }
    let loaderID = ctx.query.loaderID
    try {
        result = await 生成缩略图(源文件地址, loaderID)
    } catch (e) {
        console.warn(e)
        return
    }
    if (result) {
        ctx.stats.缓存对象.set(ctx.stats.缓存键, result)
    }
    statPromisesArray.paused = false
    return result
}
 
export async function genThumbnail(req, res, next) {
    const 源文件地址 = req.sourcePath
    const stat = await statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const start = performance.now()
    const thumbnailCache = buildCache('thumbnailCache')
    let ctx = {
        req,
        res,
        query: req.query,
        缓存对象: thumbnailCache,
        stats: {
            源文件地址,
            缓存键,
            缓存对象: thumbnailCache
        }
    }
    let $next = () => {
        console.log(`生成缩略图，耗时：${performance.now() - start}ms`)
    }

    statPromisesArray.paused = true
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let result = null
    let type = null
    try {
        result = await getThumbnailWithCache(ctx)
        if (result) {
            type = result.type
            if (type) {
                res.type(type)
                res.send(result.data)
                return
            } else {
                res.type('png')
                res.send(result)
                return
            }
        }
    } catch (e) {
        console.warn(e)
        res.status(500).send('Error processing image: ' + e.message);
    }
    statPromisesArray.paused = false
    next && next()
}
