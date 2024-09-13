import {  根据路径查找并加载主数据库 } from "./mainDb/init.js";
export { 根据路径查找并加载主数据库}
let dbs = {}
globalThis.thumbnailPathDBs = globalThis.thumbnailPathDBs || dbs

/**
 * 根据stat计算hash
 */
const { createHash } = require('crypto');

export function 计算哈希(stat) {
    const hash = createHash('md5');
    // 直接向hash对象添加数据，减少字符串拼接
    // 使用path,size和mtime来进行hash,这样只有在mtime改变时才会需要写入
    hash.update(stat.path);
    hash.update(stat.size.toString());
    hash.update(stat.mtime.getTime().toString());
    // 生成哈希值，并截取前8个字符，以提高性能
    const hashValue = hash.digest().toString('hex').substring(0, 8);
    return hashValue
}
export async function 删除缩略图缓存行(fullName) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(fullName)
    const stmt = 磁盘缩略图数据库.prepare('DELETE FROM thumbnails WHERE fullName = ?');
    const result = stmt.run(fullName);
    return result.changes; // 返回受影响的行数
}
export async function 写入缩略图缓存行(fullName, updateTime, stat, entryType) {
    if (!stat) {
        throw new Error('尝试写入缓存记录时未提供stat')
    }
    if (fullName.indexOf('\\') > -1) {
        throw new Error('尝试写入缓存时路径未转换')
    }
    if (!stat.type && !entryType) {
        throw new Error('尝试写入缓存时未提供条目类型')
    }
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(fullName)


    //显式指定的优先
    const hash = 计算哈希(stat)
    // 检查 statHash 是否已存在
    //console.log('写入缓存记录', fullName, hash, updateTime, stat, entryType)
    // 检查哈希值是否已存在

    const stmt = 磁盘缩略图数据库.prepare(`
        INSERT OR REPLACE INTO thumbnails 
        (fullName, type, statHash, updateTime, stat, size, ctime, atime, mtime)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
            SELECT 1 FROM thumbnails 
            WHERE fullName = ? AND statHash = ?
        )
    `);
    const updateTimeValue = updateTime instanceof Date ? updateTime.getTime() : updateTime;
    const type = entryType || stat.type;
    
    const result = await stmt.run(
        fullName,
        type,
        hash,
        updateTimeValue,
        JSON.stringify(stat),
        stat.size !== undefined ? stat.size : -1,
        stat.ctime ? new Date(stat.ctime).getTime() : -1,
        stat.atime ? new Date(stat.atime).getTime() : -1,
        stat.mtime ? new Date(stat.mtime).getTime() : -1,
        fullName,
        hash
    );
    return result
}

export async function 查找子文件夹(dirPath, search) {
    const start = Date.now()
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(dirPath)
    // 准备 SQL 查询语句
    let sql = `
            SELECT stat
            FROM thumbnails 
            WHERE fullName LIKE ? || '%' 
            AND fullName != ? 
            AND type = 'file'
        `;
    // 如果有search参数，添加额外的过滤条件
    if (search) {
        sql += ` AND fullName LIKE '%' || ? || '%'`;
    }
    sql += ` LIMIT 100000`;
    const stmt = 磁盘缩略图数据库.prepare(sql);
    const countStmt = 磁盘缩略图数据库.prepare('SELECT MAX(rowid) as approximate_count FROM thumbnails');
    const approximateCount = countStmt.get().approximate_count;

    // 执行查询并返回结果
    let results;
    if (search) {
        results = stmt.all(dirPath + "%", dirPath, search);
    } else {
        results = stmt.all(dirPath + "%", dirPath);
    }
    // 返回子文件夹的完整路径列表
    console.log(Date.now() - start)
    return {
        results: results.map(item => item.stat),
        approximateCount: approximateCount
    }
}

export async function 查找文件hash(filePath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(filePath)
    const stmt = 磁盘缩略图数据库.prepare('SELECT fullName, statHash, updateTime FROM thumbnails WHERE fullName = ?');
    const result = stmt.get(filePath);
    return result;
}
export async function 查找文件状态(filePath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(filePath)
    const stmt = 磁盘缩略图数据库.prepare(`SELECT stat , statHash FROM thumbnails WHERE fullName = ? and type='file'`);
    const result = stmt.get(filePath);
    return result;
}

export async function 查找并解析文件状态(filePath) {
    const result = await 查找文件状态(filePath)
    if (result) {
        let json = JSON.parse(result.stat)
        json.hash = result.statHash
        return json
    } else {
        return undefined
    }
}
export async function 提取所有子目录文件扩展名(dirPath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(dirPath)
    const sql = `
        SELECT DISTINCT LOWER(SUBSTR(fullName, INSTR(fullName, '.') + 1)) AS extension
        FROM thumbnails
        WHERE fullName LIKE ? || '%'
        AND type = 'file'
        AND INSTR(fullName, '.') > 0
    `;
    const stmt = 磁盘缩略图数据库.prepare(sql);
    const results = stmt.all(dirPath + "%");
    return results.map(row => row.extension);
}