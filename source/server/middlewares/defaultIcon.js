import { sendFileWithCacheSet } from "../handlers/utils/responseType.js"
import { getCachePath } from "../processors/fs/cached/fs.js"
import { buildCache } from "../processors/cache/cache.js"
import { statWithCatch } from "../processors/fs/stat.js"
import { genStatHash } from "../processors/fs/stat.js"
import { statPromisesArray } from "../processors/fs/disk/tree.js"
import { genThumbnail } from "../handlers/thumbnail.js"
export const sendDefaultIcon = (req, res) => {
    const iconPath = process.execPath.replace('SiYuan.exe', 'resources\\stage\\icon-large.png')
    res.sendFile(iconPath)
    return
}
export const sendDfaultIconWithCacheWrite = async (req, res, next) => {
    sendDefaultIcon(req, res)
    next()
}
export const getSourcePath = (req, res, next) => {
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
export const checkAndSendExtensionIcon = async (req, res, next) => {
    const 源文件地址 = req.sourcePath
    const stat = statWithCatch(源文件地址)
    let extension = 源文件地址.split('.').pop()
    const 缓存目录 = (await getCachePath(源文件地址, 'thumbnails', true)).cachePath
    let 扩展名缓存路径 = require('path').join(缓存目录, `${extension}.thumbnail.png`)
    const thumbnailCache = buildCache('thumbnailCache')
    const 缓存键 = JSON.stringify(stat)
    if (await sendFileWithCacheSet(res, 扩展名缓存路径, thumbnailCache, 缓存键)) {
        console.log(`扩展名缓存命中`)
        statPromisesArray.paused = false;
        return
    }
    next()
}
export const checkAndSendThumbnailWithMemoryCache = async (req, res, next) => {
    const 源文件地址 = req.sourcePath
    const stat = statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    let cacheResult = thumbnailCache.get(缓存键)
    if (cacheResult && Buffer.isBuffer(cacheResult)) {
        res.send(cacheResult)
        statPromisesArray.paused = false;
        return
    }
    next()
}
export const checkAndSendWritedIconWithCacheWrite = async (req, res, next) => {
    const 源文件地址 = req.sourcePath
    const stat = statWithCatch(源文件地址)
    const 缓存键 = JSON.stringify(stat)
    const thumbnailCache = buildCache('thumbnailCache')
    const hashedName = genStatHash(stat) + '.thumbnail.png'
    const 缓存目录 = (await getCachePath(源文件地址, 'thumbnails', true)).cachePath
    let 缓存路径 = require('path').join(缓存目录, hashedName)
    // 先检查是否存在缓存的缩略图
    if (await sendFileWithCacheSet(res, 缓存路径, thumbnailCache, 缓存键)) {
        console.log(`文件缩略图硬盘缓存命中`)
        statPromisesArray.paused = false;
        return
    }
    next()
}
export const buildCtxAndSendThumbnail = async (req, res, next) => {
    const 源文件地址 = req.sourcePath
    const stat = statWithCatch(源文件地址)
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
    genThumbnail(ctx, $next);
    statPromisesArray.paused = false
}