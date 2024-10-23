import { buildCache } from '../cache/cache.js'
import { statWithCatch } from '../fs/stat.js'
import { getColor } from './color.js'
import { diffColor } from '../../../utils/color/Kmeans.js'
import { 获取哈希并写入数据库 } from '../fs/stat.js'
import { noThumbnailList, imageExtensions, 是否不需要单独缩略图 } from './utils/lists.js'
import { globalTaskQueue } from '../queue/taskQueue.js'
import { 内置缩略图生成器序列 } from './loaders/internal.js'
import { getCommonLoader, getLoader } from './loaders/query.js'
import { getCachePath } from '../fs/cached/fs.js'

const sharp = require('sharp')
export function listLoaders() {
    return 内置缩略图生成器序列.map(item => {
        return {
            id: item.id,
            name: item.name,
            match: item.match,
            sys: item.sys,
            support: item.support,
            description: item.description
        }
    })
}



const fs = require('fs')
import { asyncReadFile } from '../fs/utils/withExists.js'
import { getFileExtension } from '../../../utils/fs/extension.js'
const commonIcons = new Map()
const 创建缩略图生成上下文 = async (imagePath, loaderID = null) => {
    imagePath = imagePath.replace(/\\/g, '/')
    const extension = getFileExtension(imagePath)
    let useExtension = 是否不需要单独缩略图(extension)

    let loader = await getLoader(imagePath, loaderID, 内置缩略图生成器序列)
    if (!loader) {
        loader = await getCommonLoader()
    }
    const stat = await statWithCatch(imagePath)
    if (!stat) {
        throw new Error(`获取文件属性失败,不能为${imagePath}创建缩略图上下文`)
    }
    let useRaw = false
    if (imageExtensions.includes(extension) && stat.size < 1024 * 1024 * 1) {
        useRaw = true
    }
    const hash = await 获取哈希并写入数据库(stat)
    const cacheDir = (await getCachePath(imagePath, 'thumbnails')).cachePath
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true })
    }
    const hashedName = hash + '.thumbnail.png'
    const targetPath = require('path').join(cacheDir, hashedName)
    const extensionThumbnailPath = require('path').join(cacheDir, `${extension}.thumbnail.png`)
    return {
        extension,
        useExtension,
        useRaw,
        loader,
        stat,
        hash,
        fixedPath: imagePath,
        cacheDir,
        hashedName,
        targetPath,
        extensionThumbnailPath
    }
}

function 查询缓存内缩略图(ctx, callback) {
    const { hash } = ctx
    if (tumbnailCache.get(hash)) {
        console.log('使用内存缓存', ctx.fixedPath)
    }
    callback(tumbnailCache.get(hash))
}
async function 查询缩略图硬盘缓存(ctx, callback) {
    //如果原始缓存有存在的话,说明特别生成了缩略图
    let fromFIle1 = await asyncReadFile(
        ctx.targetPath,
        //表示不存在时不抛出错误
        true
    )
    if (fromFIle1 && fromFIle1.length >= 100) {
        callback(fromFIle1)
    }
}
async function 查询eagle缩略图(ctx,callback){
    const imageName = ctx.fixedPath
    const eagle缩略图名 = imageName.replace(`.${ctx.extension}`,'').trim()+'_thumbnail.png'
    console.log(eagle缩略图名)
    let fromFIle1 = await asyncReadFile(
        eagle缩略图名,
        //表示不存在时不抛出错误
        true
    )
    if (fromFIle1 && fromFIle1.length >= 100) {
        console.log(`eagle格式缩略图发现,为${ctx.fixedPath}使用eagle缩略图`)
        callback(fromFIle1)
    }
}
async function 查询扩展名缩略图硬盘缓存(ctx, callback) {
    //如果原始缓存有存在的话,说明特别生成了缩略图
    let fromFIle1 = await asyncReadFile(
        ctx.extensionThumbnailPath,
        //表示不存在时不抛出错误
        true
    )
    if (fromFIle1 && fromFIle1.length >= 100) {
        callback(fromFIle1)
    }
}
async function 计算缩略图(ctx, callback) {
    console.log(`为${ctx.fixedPath}生成缩略图到${ctx.targetPath}`,ctx.loader)
    try{
    let thumbnailBuffer = await ctx.loader.generateThumbnail(ctx.fixedPath, ctx.targetPath)
    callback(thumbnailBuffer)
    }catch(e){
        let thumbnailBuffer = await getCommonLoader().generateThumbnail(ctx.fixedPath, ctx.targetPath,e)
        callback(thumbnailBuffer)
    }
}
export const 生成缩略图 = async (imagePath, loaderID = null) => {
    const ctx = await 创建缩略图生成上下文(imagePath, loaderID)
    const { extension, useExtension, useRaw, loader, stat, hash, fixedPath } = ctx
    globalTaskQueue.paused = true
    return new Promise(async (resolve, reject) => {
        let resolved
        let resultBuffer
        const callback = (result) => {
            if (result) {
                resultBuffer = result
                resolve(result)
                resolved = true

                tumbnailCache.set(ctx.hash, result)
            }
            globalTaskQueue.paused = false
        }
        查询缓存内缩略图(ctx, callback)
        if (resolved) {
            return
        }

        if (useRaw) {
            console.log('使用原始图', fixedPath)
            try {
                const rawBuffer = fs.readFileSync(fixedPath)
                tumbnailCache.set(hash, rawBuffer)
                resolve({
                    data: rawBuffer,
                    type: extension,
                    isImage: true,
                })
                globalTaskQueue.paused = false
                return
            } catch (e) {
                console.warn(e)
                reject(new Error('未能从磁盘读取缩略图', fixedPath))
                globalTaskQueue.paused = false
                return
            }
        }
        await 查询eagle缩略图(ctx,callback)
        if(resolved){
            return 
        }
        await 查询缩略图硬盘缓存(ctx, callback)
        if (resolved) {
            return
        }
    
        useExtension && await 查询扩展名缩略图硬盘缓存(ctx, callback)
        if (resolved) {
            return
        }
       
        await 计算缩略图(ctx, callback)
        if (resultBuffer&&Buffer.isBuffer(resultBuffer)) {
            if (useExtension) {
                fs.writeFile(ctx.extensionThumbnailPath, resultBuffer, (err) => {
                    err && console.error('缩略图生成成功但是写入失败', extension, resultBuffer, fixedPath,err)
                })
            } else {
                console.log(ctx.targetPath)
                fs.writeFile(ctx.targetPath, resultBuffer, (err) => {
                    err && console.error('缩略图生成成功但是写入失败', extension, resultBuffer, fixedPath,err)
                })
            }
        }
        if (resolved) {
            return
        }
        reject(new Error(`未能为${fixedPath}生成缩略图`))
    })




    let thumbnailBuffer = await loader.generateThumbnail(imagePath, 缓存路径)
    if (thumbnailBuffer) {
        //@todo 使用sharp压缩图片,暂时不压缩,因为会对色彩分析造成非常剧烈的干扰
        if (thumbnailBuffer.length > 1024 * 10) {
            thumbnailBuffer = await sharp(thumbnailBuffer)
                .png({ compressionLevel: 9 })
                .toBuffer()
            console.log('成功生成缩略图', imagePath)
        }
        tumbnailCache.set(hash, thumbnailBuffer)
        if (noThumbnailList.includes(extension) && !commonIcons.has(extension)) {
            commonIcons.set(extension, thumbnailBuffer)
            fs.writeFile(缓存路径, thumbnailBuffer, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            })
        }
        if (!noThumbnailList.includes(extension)) {
            fs.writeFile(缓存路径, thumbnailBuffer, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            })
        }
        return thumbnailBuffer
    }
}



const tumbnailCache = buildCache('thumbnailCache')
export const 准备缩略图 = async (imagePath, loaderID = null) => {
    let fn = async () => {
        try {
            await genThumbnailColor(imagePath, loaderID)
        } catch (e) {
            console.error(e)
        } finally {
            return imagePath
        }
    }
    // 使用当前时间的负值作为优先级
    const priority = -Date.now();
    // 处理可能的边界情况
    if (priority === 0) {
        // 在极少数情况下，如果 Date.now() 返回 0，我们使用一个非常小的负数
        fn = globalTaskQueue.priority(fn, -Number.MIN_SAFE_INTEGER);
    } else {
        fn = globalTaskQueue.priority(fn, priority);
    }
    globalTaskQueue.push(fn);
}
export async function genThumbnailColor(filePath, loaderID = null) {
    const thumbnailBuffer = await 生成缩略图(filePath, loaderID)
    // 欧几里得聚类,较为简单,但效果一般
    // 不过颜色查询应该够用了
    if (!thumbnailBuffer) {
        return null
    }
    console.log(thumbnailBuffer)

    const colors = await getColor(thumbnailBuffer, filePath)
    console.log(colors)
    return colors
}
export async function diffFileColor(filePath, color) {
    let simiColor = await genThumbnailColor(filePath)
    if (!simiColor) {
        return false
    }
    for await (let item of simiColor) {
        if (diffColor(item.color, color)) {
            return true
        }
    }
    return false
}