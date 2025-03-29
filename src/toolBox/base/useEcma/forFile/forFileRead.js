/**
 * @fileoverview 文件读取相关工具函数
 */

/**
 * 分块读取文件内容
 * @param {string} filePath 文件路径
 * @param {number} chunkSize 每块大小
 * @param {number} maxBytes 最大读取字节数
 * @param {function} callback 回调函数
 */
export const readFileInChunks = (filePath, chunkSize, maxBytes, callback) => {
    const fs = window.require('fs');
    let bytesReadTotal = 0;
    let position = 0;

    const readNextChunk = () => {
        if (bytesReadTotal >= maxBytes) {
            callback(null, null);
            return;
        }

        fs.open(filePath, 'r', (err, fd) => {
            if (err) {
                callback(err, null);
                return;
            }
            const buffer = Buffer.alloc(chunkSize);
            fs.read(fd, buffer, 0, chunkSize, position, (err, bytesRead, buffer) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                if (bytesRead > 0) {
                    bytesReadTotal += bytesRead;
                    position += bytesRead;
                    callback(null, buffer.toString('utf8', 0, bytesRead));
                    setTimeout(readNextChunk, 0);
                } else {
                    callback(null, null);
                }
                fs.close(fd, (err) => {
                    if (err) console.error(err);
                });
            });
        });
    };
    readNextChunk();
}; 