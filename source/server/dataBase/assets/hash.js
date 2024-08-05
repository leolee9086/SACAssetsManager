export const createHashFromUri = (db, uri) => {
    db.prepare(
        `CREATE TABLE IF NOT EXISTS hash (
            id TEXT NOT NULL,
            hash TEXT NOT NULL,
            UNIQUE(id,hash)
        )`
    ).run();
}

/**
 * 判断一个uri是否是本地文件
 * @param {string} uri 
 * @returns {boolean}
 */
export const isLocal = (uri) => {
    return uri.startsWith('file://') 
}

/**
 * 判断一个uri是否是远程文件
 * @param {string} uri 
 * @returns {boolean}
 */
export const isRemote = (uri) => {
    return !isLocal(uri);
}

/**
 * 对于远程文件,使用fetch获取文件内容,然后生成hash
 * @param {string} uri 
 * @returns {Promise<string>} 哈希值
 */
export const createHashFromRemote = (uri) => {
    return fetch(uri).then(res => res.text()).then(text => createHash(text));
}

/**
 * 使用文件名和文件大小作为种子生成一致的随机数，从本地文件生成hash
 * 最多读取其中10MB的内容
 * @param {string} uri 文件的本地路径
 * @returns {Promise<string>} 哈希值
 */
export const createHashFromLocal = (uri) => {
    return new Promise((resolve, reject) => {
        fs.stat(uri, (err, stats) => {
            if (err) {
                return reject(err);
            }

            // 使用文件URI和文件大小作为种子生成随机数
            const seed = genSeed(uri, stats.size);
            const randomOffset = Math.floor(seed.hashCode() * (stats.size - 1024 * 1024));

            // 创建可读流并跳到随机位置
            const readStream = fs.createReadStream(uri, { start: randomOffset });
            const hash = crypto.createHash('sha256');

            readStream.on('error', reject);

            readStream.on('data', (chunk) => {
                hash.update(chunk);
            });

            readStream.on('end', () => {
                const hashValue = hash.digest('hex');
                resolve(hashValue);
            });
        });
    });
};
/**
 * 生成种子
 * @param {string} uri 
 * @param {number} size 
 * @returns {string}
 */
export const genSeed = (uri, size) => {
    return `${uri}-${size}`;
}

