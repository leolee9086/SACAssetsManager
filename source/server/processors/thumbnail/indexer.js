import { buildCache } from "../cache/cache.js";
import { getCachePath } from "../fs/cached/fs.js";
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const dbVersion = '06'
let dbs = {}

globalThis.thumbnailPathDBs = globalThis.thumbnailPathDBs || dbs
function 初始化数据库(dbPath, root) {
    dbs[root] = new Database(dbPath);
    dbs[root].exec(`
        CREATE TABLE IF NOT EXISTS thumbnails (
            fullName TEXT PRIMARY KEY,
            type Text,
            statHash TEXT,
            updateTime INTEGER,
            stat TEXT
        )
    `);
    return dbs[root]
}
async function 获取数据库地址(filePath) {
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`)
    return { cachePath, root }
}
export const 文件缩略图路径映射 = buildCache('thumbnailPathCache')
export async function 根据路径查找并加载缩略图索引(filePath) {
    const { cachePath, root } = await 获取数据库地址(filePath)
    const dirPath = path.dirname(cachePath) + '\\';
    if (!fs.existsSync(dirPath)) {

    }
    if (fs.existsSync(cachePath)) {
        console.log('从cachePath加载缩略图缓存')
        初始化数据库(cachePath, root);
    }
}

export async function 写入缩略图缓存行(fullName, statHash, updateTime, stat, entryType) {
    if (!stat) {
        throw new Error('尝试写入缓存记录时未提供stat')
    }
    if (fullName.indexOf('\\') > -1) {
        throw new Error('尝试写入缓存时路径未转换')
    }
    if (!stat.type && !entryType) {
        throw new Error('尝试写入缓存时未提供条目类型')
    }
    const { cachePath, root } = await 获取数据库地址(fullName)
    //显式指定的优先
    console.log('写入缓存记录',fullName, statHash, updateTime, stat, entryType)
    const type = entryType||stat.type
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root)
    const stmt = 磁盘缩略图数据库.prepare('INSERT OR REPLACE INTO thumbnails (fullName,type,statHash,updateTime,stat) VALUES (?, ?, ?,?,?)');
    const updateTimeValue = updateTime instanceof Date ? updateTime.getTime() : updateTime;
    stmt.run(fullName, type, statHash, updateTimeValue, JSON.stringify(stat));
}

export async function 查找文件hash(filePath) {
    const { cachePath, root } = await 获取数据库地址(filePath)
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);
    const stmt = 磁盘缩略图数据库.prepare('SELECT fullName, statHash, updateTime FROM thumbnails WHERE fullName = ?');
    const result = stmt.get(filePath);
    console.log('查询结果:', result); // 添加日志
    return result;
}