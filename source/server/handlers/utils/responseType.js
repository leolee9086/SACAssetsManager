
export function stat2assetsItemStringLine(stat) {
    const { name, path, type, size, mtime, mtimems, error } = stat;
    const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
    return (`data:${data}\n`)
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