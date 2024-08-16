const fs=require('fs')

/**
 * 监听文件路径,有变化时进行处理
 * @param {string} filePath 文件路径
 * @param {string} encoding 编码
 * @param {function} callback 回调函数
 */
export function watchFile(filePath, encoding, callback) {
    fs.watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
            callback(filePath, filename, encoding, callback);
        }
    });
}


