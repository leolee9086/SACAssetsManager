import { buildCache } from "../cache/cache.js";
import { getCachePath } from "../fs/cached/fs.js";
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const dbVersion= '01'
let dbs = {}
globalThis.thumbnailPathDBs =globalThis.thumbnailPathDBs||dbs
function 初始化数据库(dbPath,root) {
    dbs[root] = new Database(dbPath);
    dbs[root].exec(`
        CREATE TABLE IF NOT EXISTS thumbnails (
            filePath TEXT PRIMARY KEY,
            thumbnailPath TEXT,
            updateTime INTEGER,
            stat TEXT
        )
    `);
    return dbs[root]
}

export const 文件缩略图路径映射 = buildCache('thumbnailPathCache')
export async function 根据路径查找并加载缩略图索引(filePath) {
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`)
    const dirPath = path.dirname(cachePath) + '\\';
    if (!fs.existsSync(dirPath)) {

    }
    if (fs.existsSync(cachePath)) {
        console.log('从cachePath加载缩略图缓存')
        初始化数据库(cachePath,root);
    }
}

export async function 写入缩略图缓存行(filePath, thumbnailPath, updateTime,stat) {
    if(!stat){
        throw new Error('尝试写入缓存记录时未提供stat')
    }
    if(filePath.indexOf('\\')>-1){
        throw new Error('尝试写入缓存时路径未转换')
    }
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`)
    let 磁盘缩略图数据库 =  初始化数据库(cachePath,root)
    const stmt = 磁盘缩略图数据库.prepare('INSERT OR REPLACE INTO thumbnails (filePath, thumbnailPath, updateTime,stat) VALUES (?, ?, ?,?)');
    const updateTimeValue = updateTime instanceof Date ? updateTime.getTime() : updateTime;
    stmt.run(filePath, thumbnailPath, updateTimeValue,JSON.stringify(stat));
    文件缩略图路径映射.set(filePath, JSON.stringify({
        filePath,
        thumbnailPath,
        updateTime: updateTimeValue,
        stat:JSON.stringify(stat)
    }));
}

export async function 查找文件缩略图路径(filePath) {
    // 首先尝试从内存缓存中获取
    const cachedData = 文件缩略图路径映射.get(filePath);
    if (cachedData) {
        const { thumbnailPath, updateTime } = JSON.parse(cachedData);
        return { thumbnailPath, updateTime };
    }

    // 如果内存缓存中没有，则从数据库中查找
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`);
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);

    const stmt = 磁盘缩略图数据库.prepare('SELECT thumbnailPath, updateTime FROM thumbnails WHERE filePath = ?');
    const result = stmt.get(filePath);

    if (result) {
        // 如果在数据库中找到，更新内存缓存
        文件缩略图路径映射.set(filePath, JSON.stringify({
            filePath,
            thumbnailPath: result.thumbnailPath,
            updateTime: result.updateTime
        }));
        return { thumbnailPath: result.thumbnailPath, updateTime: result.updateTime };
    }

    // 如果数据库中也没有找到，返回 null
    return null;
}