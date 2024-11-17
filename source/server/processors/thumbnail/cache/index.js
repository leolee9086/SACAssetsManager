import { buildCache } from '../../cache/cache.js'
import { asyncReadFile } from '../../fs/utils/withExists.js'

const tumbnailCache = buildCache('thumbnailCache')

// 处理内存缓存查询
async function 查询内存缓存(ctx) {
    const { hash, fixedPath } = ctx
    const cacheResult = tumbnailCache.get(hash)
    if (cacheResult) {
        console.log('使用内存缓存', fixedPath)
        return cacheResult
    }
    return null
}

async function 查询eagle缩略图(ctx) {
    const imageName = ctx.fixedPath
    const eagle缩略图名 = imageName.replace(`.${ctx.extension}`,'').trim()+'_thumbnail.png'
    
    let fromFile = await asyncReadFile(eagle缩略图名, true)
    if (fromFile && fromFile.length >= 100) {
        console.log(`eagle格式缩略图发现,为${ctx.fixedPath}使用eagle缩略图`)
        return fromFile
    }
    return null
}

async function 查询缩略图硬盘缓存(ctx) {
    let fromFile = await asyncReadFile(ctx.targetPath, true)
    if (fromFile && fromFile.length >= 100) {
        return fromFile
    }
    return null
}

async function 查询扩展名缩略图硬盘缓存(ctx) {
    let fromFile = await asyncReadFile(ctx.extensionThumbnailPath, true)
    if (fromFile && fromFile.length >= 100) {
        return fromFile
    }
    return null
}

async function 查询所有缓存(ctx) {
    const memoryCache = await 查询内存缓存(ctx)
    if (memoryCache) return memoryCache
    const eagleCache = await 查询eagle缩略图(ctx)
    if (eagleCache) return eagleCache
    const diskCache = await 查询缩略图硬盘缓存(ctx)
    if (diskCache) return diskCache
    if (ctx.useExtension) {
        const extensionCache = await 查询扩展名缩略图硬盘缓存(ctx)
        if (extensionCache) return extensionCache
    }
    return null
}

export { tumbnailCache, 查询所有缓存 }