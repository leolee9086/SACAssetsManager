import mingo from './mingo.js'
const fs = require('fs');
const path = require('path');

/**
 * 获取目录下所有文件的Mingo可查询格式
 */
function 获取目录文件数据(dirPath, options = {}) {
    const { recursive = false, extensions } = options;
    const files = [];

    function readDir(currentPath) {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (recursive) {
                    readDir(fullPath);
                }
            } else {
                if (!extensions || extensions.includes(path.extname(item))) {
                    files.push({
                        path: fullPath,
                        name: item,
                        ext: path.extname(item),
                        size: stat.size,
                        mtime: stat.mtime,
                        ctime: stat.ctime,
                        isDirectory: false
                    });
                }
            }
        });
    }

    readDir(dirPath);
    return files;
}

/**
 * 查询目录中的文件
 */
function 查询目录文件(dirPath, query, options) {
    const files = 获取目录文件数据(dirPath, options);
    return 执行mingo查询(query, files);
}

/**
 * 查找匹配的第一个文件
 */
function 查找单个文件(dirPath, query, options) {
    const files = 获取目录文件数据(dirPath, options);
    const result = 执行mingo查询(query, files);
    return result.length > 0 ? result[0] : null;
}

module.exports = {
    获取目录文件数据,
    查询目录文件,
    查找单个文件
};