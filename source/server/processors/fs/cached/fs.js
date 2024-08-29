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

function getRoot(path){
    let split = path.indexOf('\\')>-1?'\\':'/'
    return path.split(split)[0]
}
export function getCachePath(path,cacheName){
    const root = getRoot(path)
    const cachePath = require('path').join(root,'.sac',cacheName)
    return {
        root,
        cachePath
    }
}