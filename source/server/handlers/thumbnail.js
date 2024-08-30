import {  listLoaders as listThumbnailLoaders } from '../processors/thumbnail/loader.js '
import { 生成缩略图 } from '../processors/thumbnail/loader.js'
import { 获取颜色 } from '../processors/color/index.js'
import { 获取图片尺寸 } from '../processors/size/size.js'
let cacheLoader = (ctx) => {
    let { 缓存对象, 缓存键, 缓存时间 } = ctx.stats
    let result = 缓存对象.get(缓存键)
    if (result) {
       // console.log("缩略图缓存命中",缓存键)
        return result
    }
}
const getThumbnailWithCache = async (ctx)=>{
    let { 源文件地址, 缓存键 } = ctx.stats
    console.log(源文件地址)
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
    if(result){
        ctx.stats.缓存对象.set(ctx.stats.缓存键,result)
    }
    return result
}
export async function getColor(ctx, next) {
    let { req, res, 缓存对象 } = ctx
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let thumbnail = await getThumbnailWithCache(ctx)
    let result = await 获取图片尺寸(thumbnail)
    res.json(result)
}
export async function genPallte(ctx, next) {
    let { req, res, 缓存对象 } = ctx
    let { 源文件地址, 缓存键 } = ctx.stats
    if (!源文件地址) {
        res.status(400).send('Invalid request: missing source file address');
        return
    }
    let thumbnail = await getThumbnailWithCache(ctx)
    let result = await 获取颜色(thumbnail)
    res.json(result)
}



export async function genThumbnail(ctx, next) {
    let { req, res, 缓存对象 } = ctx
    let { 源文件地址, 缓存键 } = ctx.stats
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
    return
}
export function listLoaders(req, res) {
    res.json(listThumbnailLoaders())
}