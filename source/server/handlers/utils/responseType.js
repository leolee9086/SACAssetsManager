
export function stat2assetsItemStringLine(stat,json=false) {
    const { 
        name, 
        path,
        atime,
        birthtime,
        ctime,
        mode,
        mtime,
        type, 
        size, 
        aTimeMs, 
        birthtimeMs, 
        ctimeMs, 
        mtimeMs, 
        error 
    } = stat;
    
    const data = { 
        name, 
        path, 
        atime,
        birthtime,
        ctime,
        mtime, 
        mode,
        id: `localEntrie_${path}`, 
        type: 'local', 
        size, 
        aTimeMs, 
        birthtimeMs, 
        ctimeMs, 
        mtimeMs, 
        error };
    if(json){
        return data
    }
    return (`data:${JSON.stringify(data)}\n`)
}

export function sendFileWithCacheSet(res, 缓存路径, 缓存, 缓存键) {
    const fs = require('fs')
    return new Promise((resolve, reject) => {
        if (fs.existsSync(缓存路径)) {
            const chunks = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                缓存.set(缓存键, buffer);
                statPromisesArray.paused = false;
            });
            res.sendFile(缓存路径, (err) => {
                if (err) {
                    console.error(err);
                    reject(err)
                    return
                }
                resolve(true)
            });
            return;
        }
        resolve(false)
    })
}