const fs = require('fs')
const cache = new Map()

export function readFile(path){
    if(cache.has(path)){
        return cache.get(path)
    }
    const data = fs.readFileSync(path)
    cache.set(path,data)
    return data
}

export function getCachePath(path,cacheName){
    const root = path.split('/')[0]
    const cachePath = require('path').join(root,'.sac',cacheName)
    return {
        root,
        cachePath
    }
}