const fs=require('fs')

/**
 * 监听文件路径,有变化时进行处理
 */
export function watchFile(filePath, encoding, callback) {
    fs.watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
            callback(filePath, filename, encoding, callback);
        }
    });
}
