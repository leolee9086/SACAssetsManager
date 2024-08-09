/**
 * 判断一个uri是否是本地文件
 * @param {string} uri 
 * @returns {boolean}
 */
export const isLocal = (uri) => {
    return uri.startsWith('file://') 
}


/**
 * 判断一个uri是否是本地文件
 * @param {string} uri 
 * @returns {boolean}
 */
export const isLocalFileUri = (uri) => {
    // 检查是否以 file:// 开头
    if (!uri.startsWith('file://')) {
        return false;
    }
    // 移除 file:// 前缀并解码
    const filePath = decodeURIComponent(uri.substring('file://'.length));
    // 检查路径是否为绝对路径
    if (!path.isAbsolute(filePath)) {
        return false;
    }
    return true;
};

/**
 * 对于远程文件,直接使用uri创建hash
 * @param {string} uri 
 * @returns {Promise<string>} 哈希值
 */
export const createHashFromRemote = (uri) => {
    const hash = crypto.createHash('sha256');
    hash.update(uri);

    // 返回哈希值的Promise
    return new Promise((resolve, reject) => {
        hash.digest((err, buffer) => {
            if (err) {
                reject(err);
            } else {
                resolve(buffer.toString('hex'));
            }
        });
    });

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
 * @param {string} uri 文件的URI
 * @param {number} size 文件的大小，对于远程或未知大小的文件使用-1
 * @returns {string} 种子字符串
 */
export const genSeed = (uri, size) => {
    // 如果文件大小未知，使用-1作为特殊标记
    const effectiveSize = size === -1 ? 'unknown' : size.toString();

    // 使用文件URI和文件大小（或特殊标记）作为输入，创建一个哈希值
    const hash = crypto.createHash('sha256');
    hash.update(uri + effectiveSize);

    // 返回哈希值的十六进制字符串
    return hash.digest('hex');
};
