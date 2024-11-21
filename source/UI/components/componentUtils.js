import { debounce } from "../../utils/functionTools.js"
import { findTagsByFilePath,removeFilesFromTag } from "../../data/tags.js"
import { rgba数组转字符串, rgb数组转字符串 } from "../../utils/color/convert.js"
import { 获取素材属性值,计算素材类型角标 } from "../../data/attributies/parseAttributies.js"
// 获取素材文件名
const getAssetNames = (asset) => {
    return asset.path.split('/').pop()
}
const toArray = (value) => {
    return Array.isArray(value) ? value : [value];
}
const 函数工具 = { debounce }
const 色彩工具 = {rgba数组转字符串,rgb数组转字符串}
const 素材条目管理工具 ={
    获取素材属性值,
    计算素材类型角标
}

const fs = window.require('fs');

/**
 * 分块读取文件内容
 * @param {string} filePath 文件路径
 * @param {number} chunkSize 每块大小
 * @param {number} maxBytes 最大读取字节数
 * @param {function} callback 回调函数
 */
 const readFileInChunks = (filePath, chunkSize, maxBytes, callback) => {
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


// 工具函数
const 格式化文件大小 = (bytes) => {
    if (!bytes) return '未知大小';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};
const 文件系统工具={
    格式化文件大小,
    readFileInChunks    
}
/**
 * 计算标签计数
 * @param {Array} fileTags 文件标签数组
 * @returns {Object} 标签计数对象
 */
export function 计算标签文件数量(fileTags) {
    const counts = {}
    fileTags.forEach(file => {
        file.tags.forEach(tag => {
            counts[tag] = (counts[tag] || 0) + 1
        })
    })
    return counts
}
const 图片工具 = {
     空图片base64:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/ax5LIAAAAAASUVORK5CYII='
}

export {
    函数工具,
    色彩工具,
    素材条目管理工具 ,
    文件系统工具,
    图片工具,
    getAssetNames,
    toArray
}

