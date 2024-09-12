
export function stat2assetsItemStringLine(stat, json = false) {
    if(!stat){
        return ''
    }
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
        error
    };
    if (json) {
        return data
    }
    return (`data:${JSON.stringify(data)}\n`)
}
const fs = require('fs')

export function sendFileWithCacheSet(res, 缓存路径, 缓存, 缓存键) {
    return new Promise((resolve, reject) => {
        if (缓存.get(缓存键)) {
            let result = 缓存.get(缓存键)
            if (result) {
                let type = result.type
                if (type) {
                    res.type(type)
                    res.send(result.data)
                    return
                } else {
                    res.type('png')
                    res.send(result)
                    return
                }
            }
            resolve(true)
            return
        }

        if (fs.existsSync(缓存路径)) {
            resolve(true)
            const chunks = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                缓存.set(缓存键, buffer);
            });
            res.sendFile(缓存路径, (err) => {
                if (err) {
                    console.error(err);
                    return
                }
            });
            return;
        }
        resolve(false)
    })
}