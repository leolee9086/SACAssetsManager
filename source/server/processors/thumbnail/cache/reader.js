import { tumbnailCache, 查询所有缓存 } from './index.js'
async function 从缓存获取缩略图(ctx) {
    const cacheResult = await 查询所有缓存(ctx)
    if (cacheResult) {
        tumbnailCache.set(ctx.hash, cacheResult)
        return cacheResult
    }
    return null
}

export { 从缓存获取缩略图 }
