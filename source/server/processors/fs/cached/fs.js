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

