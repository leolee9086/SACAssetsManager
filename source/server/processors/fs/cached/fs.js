import { buildCache } from '../../cache/cache.js'
const fs = require('fs')
const cache = new Map()

export function readFile(path) {
    if (cache.has(path)) {
        return cache.get(path)
    }
    const data = fs.readFileSync(path)
    cache.set(path, data)
    return data
}

export function getRoot(path) {
    console.log('[getRoot] 开始获取根目录:', path);
    let split = path.indexOf('\\') > -1 ? '\\' : '/'
    const root = path.split(split)[0]
    console.log('[getRoot] 获取根目录完成:', { root, split });
    return root
}


const existCache = buildCache('exist')
export function getCachePath(path, cacheName, isDir = false) {
    console.log('[getCachePath] 开始获取缓存路径:', { path, cacheName, isDir });
    const root = getRoot(path)
    const cacheDir = require('path').join(root, '.sac')
    return new Promise((resolve, reject) => {
        try {
            const cachePath = require('path').join(root, '.sac', cacheName)
            console.log('[getCachePath] 缓存路径:', { cachePath, cacheDir });
            if (isDir) {
                if (!existCache.get(cachePath) && !fs.existsSync(cachePath)) {
                    console.log('[getCachePath] 创建目录缓存:', cachePath);
                    fs.mkdirSync(cachePath, { recursive: true })
                    existCache.set(cachePath, true)
                    setTimeout(() => {
                        existCache.delete(cachePath)
                    }, 1000 * 60 * 60 * 24)
                }
            } else {
                if (!existCache.get(cacheDir) && !fs.existsSync(cacheDir)) {
                    console.log('[getCachePath] 创建缓存目录:', cacheDir);
                    fs.mkdirSync(cacheDir, { recursive: true })
                    existCache.set(cacheDir, true)
                    setTimeout(() => {
                        existCache.delete(cacheDir)
                    }, 1000 * 60 * 60 * 24)
                }
            }
            console.log('[getCachePath] 获取完成:', { root, cachePath });
            resolve({
                root,
                cachePath
            })
        } catch (error) {
            console.error('[getCachePath] 获取缓存路径失败:', error)
            reject(error)
        }
    })
}