const crypto = require('crypto');

// 创建内存缓存
const memoryCache = new Map();

// 生成缓存键的函数保持不变
export function generateCacheKey(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}

// 从缓存中获取并提供数据
export async function serveFromCache(cacheKey, res) {
    if (memoryCache.has(cacheKey)) {
        const cachedData = memoryCache.get(cacheKey);
        res.type('jpeg').send(cachedData);
        return true;
    }
    return false;
}

// 保存数据到缓存
export function saveToCache(cacheKey, data) {
    memoryCache.set(cacheKey, data);
}

// 可选：添加一个清理缓存的函数
export function clearCache() {
    memoryCache.clear();
}

// 可选：添加一个获取缓存大小的函数
export function getCacheSize() {
    return memoryCache.size;
}