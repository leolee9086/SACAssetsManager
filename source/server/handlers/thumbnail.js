import { listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { 生成缩略图 } from '../processors/thumbnail/loader.js'
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

const express = require('express')
const router = express.Router()
import {
    sendDfaultIconWithCacheWrite,
    checkAndSendWritedIconWithCacheWrite,
    getSourcePath,
    文件缩略图内存缓存中间件,
    buildCtxAndSendThumbnail,
} from '../middlewares/defaultIcon.js'
import { checkAndSendExtensionIcon } from '../middlewares/thumbnails/withdiskCache.js'
router.get('/',
    getSourcePath,
    文件缩略图内存缓存中间件,
    checkAndSendExtensionIcon,
    checkAndSendWritedIconWithCacheWrite, 
    async (req, res,next) => {
    // 暂停所有文件状态获取
    statPromisesArray.paused = true
    // 前端保留15秒的缓存
    res.setHeader('Cache-Control', 'public, max-age=15')
    try{
        next()
    }catch(e){
        console.log(e)
    }
    statPromisesArray.paused = false
    return
},buildCtxAndSendThumbnail,sendDfaultIconWithCacheWrite);
export const genThumbnailRouter = router

export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}