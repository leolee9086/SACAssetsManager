import { sendFileWithCacheSet } from "../handlers/utils/responseType.js"
import { getCachePath } from "../processors/fs/cached/fs.js"
import { buildCache } from "../processors/cache/cache.js"
import { statWithCatch } from "../processors/fs/stat.js"
import { 获取哈希并写入数据库 } from "../processors/fs/stat.js"
import { globalTaskQueue } from "./runtime_queue.js"
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
    globalTaskQueue.paused = true;
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

export const 生成默认缩略图路径=async(path)=>{
    const stat = await statWithCatch(path)
    const hashedName =await 获取哈希并写入数据库(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(path, 'thumbnails', true)).cachePath
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    return 缓存路径

}    


export const 生成缩略图响应 = async (req, res, next) => {
    globalTaskQueue.paused = true;
    await genThumbnail(req, res, next);
    globalTaskQueue.paused = false
    return 
}
export async function genThumbnail(req, res, next) {
    const 源文件地址 = req.sourcePath
    const stat = await statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
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
    globalTaskQueue.paused = true
    let loaderID = ctx.query.loaderID

    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let result = null
    let type = null
    try {
        result = await 生成缩略图(源文件地址, loaderID)
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
    globalTaskQueue.paused = false
    next && next()
}
