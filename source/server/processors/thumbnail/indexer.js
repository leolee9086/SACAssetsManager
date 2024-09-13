import { getCachePath } from "../fs/cached/fs.js";
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const dbVersion = '07'
let dbs = {}

globalThis.thumbnailPathDBs = globalThis.thumbnailPathDBs || dbs
function 初始化数据库(dbPath, root) {
    if (dbs[root]) {
        return dbs[root]
    }
    dbs[root] = new Database(dbPath);

    dbs[root].pragma('journal_mode = WAL');
    dbs[root].pragma('synchronous = NORMAL');
    dbs[root].pragma('cache_size = 1000');
    dbs[root].pragma('temp_store = MEMORY');
    dbs[root].exec(`
        CREATE TABLE IF NOT EXISTS thumbnails (
            fullName TEXT PRIMARY KEY,
            type Text,
            statHash TEXT,
            updateTime INTEGER,
            stat TEXT,
            size INTEGER,
            ctime INTEGER,
            atime INTEGER,
            mtime INTEGER
        )
    `);
    dbs[root].prepare('CREATE INDEX IF NOT EXISTS idx_name ON thumbnails(fullName)').run();

    return dbs[root]
}

async function 获取数据库地址(filePath) {
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`)
    return { cachePath, root }
}
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
    const { cachePath, root } = await 获取数据库地址(fullName);
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);

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
    const { cachePath, root } = await 获取数据库地址(fullName)
    //显式指定的优先
    const hash = 计算哈希(stat)

    //console.log('写入缓存记录', fullName, hash, updateTime, stat, entryType)
    // 检查哈希值是否已存在
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);

    const checkStmt = 磁盘缩略图数据库.prepare('SELECT statHash FROM thumbnails WHERE fullName = ?');
    const existingHash = checkStmt.get(fullName);

    if (!existingHash || existingHash.statHash !== hash) {
        const type = entryType || stat.type
        const stmt = 磁盘缩略图数据库.prepare(`INSERT OR REPLACE INTO thumbnails (fullName, type, statHash, updateTime, stat, size, ctime, atime, mtime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const updateTimeValue = updateTime instanceof Date ? updateTime.getTime() : updateTime;

        await stmt.run(
            fullName,
            type,
            hash,
            updateTimeValue,
            JSON.stringify(stat),
            stat.size !== undefined ? stat.size : -1,
            stat.ctime ? new Date(stat.ctime).getTime() : -1,
            stat.atime ? new Date(stat.atime).getTime() : -1,
            stat.mtime ? new Date(stat.mtime).getTime() : -1
        );
    }

}

export async function 查找子文件夹(dirPath, search) {
    const start = Date.now()
    const { cachePath, root } = await 获取数据库地址(dirPath);
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);
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
    const { cachePath, root } = await 获取数据库地址(filePath)
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);
    const stmt = 磁盘缩略图数据库.prepare('SELECT fullName, statHash, updateTime FROM thumbnails WHERE fullName = ?');
    const result = stmt.get(filePath);
    return result;
}
export async function 查找文件状态(filePath) {
    const { cachePath, root } = await 获取数据库地址(filePath)
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);
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
    const { cachePath, root } = await 获取数据库地址(dirPath);
    let 磁盘缩略图数据库 = 初始化数据库(cachePath, root);
    
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