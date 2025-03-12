import { getColor } from './color.js'
import { diffColor } from '../../../utils/color/Kmeans.js'
import { globalTaskQueue,  添加后进先出后台任务 } from '../queue/taskQueue.js'
import { 内置缩略图生成器序列 } from './loaders/internal.js'
import { getCommonLoader } from './loaders/query.js'
import { tumbnailCache } from './cache/index.js'
import { 写入缩略图缓存 } from './cache/writer.js'
import { 创建缩略图生成上下文 } from './cache/context.js'
import { 从缓存获取缩略图 } from './cache/reader.js'
const fs = require('fs')
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

export const 生成文件缩略图 = async (imagePath, loaderID = null) => {
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
    } catch (e) {
        console.error(`使用默认生成器重试: ${e.message}`)
        return await getCommonLoader().generateThumbnail(ctx.fixedPath, ctx.targetPath, e)
    }
}

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

export const 准备缩略图 = async (imagePath, loaderID = null) => {
    let 缩略图任务函数 = async () => {
        try {
            await genThumbnailColor(imagePath, loaderID)
        } catch (e) {
            console.error(e)
        } finally {
            return imagePath
        }
    }
    添加后进先出后台任务(缩略图任务函数)
}
export async function genThumbnailColor(filePath, loaderID = null) {
    const thumbnailBuffer = await 生成文件缩略图(filePath, loaderID)
    if (!thumbnailBuffer) {
        return null
    }
    return await getColor(thumbnailBuffer, filePath)
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