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
    let split = path.indexOf('\\') > -1 ? '\\' : '/'
    return path.split(split)[0]
}


const existCache = buildCache('exist')
export function getCachePath(path, cacheName, isDir = false) {
    const root = getRoot(path)
    const cacheDir = require('path').join(root, '.sac')
    return new Promise((resolve, reject) => {
        try {
            const cachePath = require('path').join(root, '.sac', cacheName)
            if (isDir) {
                if (!existCache.get(cachePath) && !fs.existsSync(cachePath)) {
                    fs.mkdirSync(cachePath, { recursive: true })
                    existCache.set(cachePath, true)
                    setTimeout(() => {
                        existCache.delete(cachePath)
                    }, 1000 * 60 * 60 * 24)
                }
            } else {
                if (!existCache.get(cacheDir) && !fs.existsSync(cacheDir)) {
                    fs.mkdirSync(cacheDir, { recursive: true })
                    existCache.set(cacheDir, true)
                    setTimeout(() => {
                        existCache.delete(cacheDir)
                    }, 1000 * 60 * 60 * 24)
                }
            }
            resolve({
                root,
                cachePath
            })
        } catch (error) {
            console.error(error)
            reject(error)
        }
    })
}