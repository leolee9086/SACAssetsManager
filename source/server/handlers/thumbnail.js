import { listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { 生成缩略图 } from '../processors/thumbnail/loader.js'
import { 获取颜色 } from '../processors/color/index.js'
import { 获取图片尺寸 } from '../processors/size/size.js'
import { statPromisesArray } from '../processors/fs/disk/tree.js'
import { statWithCatch } from '../processors/fs/stat.js'
import { buildCache } from '../processors/cache/cache.js'
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
                res.type(type).send(result.data)
            } else {
                res.type('png').send(result)
            }
        }
    } catch (e) {
        console.warn(e)
        res.status(500).send('Error processing image: ' + e.message);
    }
    statPromisesArray.paused = false
    next && next()
}
export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}