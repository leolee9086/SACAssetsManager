import { statWithCatch } from '../fs/stat.js'
import { getColor } from './color.js'
import { diffColor } from '../../../utils/color/Kmeans.js'
import { 获取哈希并写入数据库 } from '../fs/stat.js'
import { noThumbnailList, imageExtensions, 是否不需要单独缩略图 } from './utils/lists.js'
import { globalTaskQueue } from '../queue/taskQueue.js'
import { 内置缩略图生成器序列 } from './loaders/internal.js'
import { getCommonLoader, getLoader } from './loaders/query.js'
import { getCachePath } from '../fs/cached/fs.js'
import { tumbnailCache, 查询所有缓存 } from './cache/index.js'
import { 写入缩略图缓存 } from './cache/writer.js'

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
import { getFileExtension } from '../../../utils/fs/extension.js'
import { 创建缩略图生成上下文 } from './cache/context.js'
/*const 创建缩略图生成上下文 = async (imagePath, loaderID = null) => {
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
}*/


// 处理缓存相关逻辑
async function 从缓存获取缩略图(ctx) {
    const cacheResult = await 查询所有缓存(ctx)
    if (cacheResult) {
        tumbnailCache.set(ctx.hash, cacheResult)
        return cacheResult
    }
    return null
}

// 生成新缩略图的核心逻辑
async function 生成新缩略图(ctx) {
    const thumbnailBuffer = await 计算缩略图(ctx)
    if (!thumbnailBuffer) {
        throw new Error(`未能为${ctx.fixedPath}生成缩略图`)
    }
    写入缩略图缓存(ctx, thumbnailBuffer)
    tumbnailCache.set(ctx.hash, thumbnailBuffer)
    return thumbnailBuffer
}

// 任务队列控制包装器
async function 执行带队列控制的任务(task) {
    globalTaskQueue.paused = true
    try {
        return await task()
    } finally {
        globalTaskQueue.paused = false
    }
}

export const 生成缩略图 = async (imagePath, loaderID = null) => {
    const ctx = await 创建缩略图生成上下文(imagePath, loaderID)
    return 执行带队列控制的任务(async () => {
        const cacheResult = await 从缓存获取缩略图(ctx)
        if (cacheResult) return cacheResult
        if (ctx.useRaw) {
            return await 处理原始图片(ctx)
        }
        return await 生成新缩略图(ctx)
    })
}

async function 计算缩略图(ctx) {
    console.log(`为${ctx.fixedPath}生成缩略图到${ctx.targetPath}`, ctx.loader)
    try {
        return await ctx.loader.generateThumbnail(ctx.fixedPath, ctx.targetPath)
    } catch(e) {
        console.error(`使用默认生成器重试: ${e.message}`)
        return await getCommonLoader().generateThumbnail(ctx.fixedPath, ctx.targetPath, e)
    }
}

// 处理原始图片的情况
async function 处理原始图片(ctx) {
    const { fixedPath, hash, extension } = ctx
    console.log('使用原始图', fixedPath)
    try {
        const rawBuffer = fs.readFileSync(fixedPath)
        tumbnailCache.set(hash, rawBuffer)
        return {
            data: rawBuffer,
            type: extension,
            isImage: true,
        }
    } catch (e) {
        console.warn(e)
        throw new Error('未能从磁盘读取缩略图: ' + fixedPath)
    }
}

//const tumbnailCache = buildCache('thumbnailCache')
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