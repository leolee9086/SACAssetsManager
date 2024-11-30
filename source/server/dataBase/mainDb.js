import { 根据路径查找并加载主数据库 } from "./mainDb/init.js";
import { 转换为相对磁盘根目录路径 } from "./utils.js";
export { 根据路径查找并加载主数据库 }
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
    hash.update(转换为相对磁盘根目录路径(stat.path));
    hash.update(stat.size.toString());
    hash.update(stat.mtime.getTime().toString());
    // 生成哈希值，并截取前8个字符，以提高性能
    const hashValue = hash.digest().toString('hex').substring(0, 8);
    return hashValue
}
export async function 删除缩略图缓存行(fullName) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(fullName)
    if (!磁盘缩略图数据库) {
        return
    }
    if (磁盘缩略图数据库.readOnly) {
        return
    }
    const stmt = 磁盘缩略图数据库.prepare('DELETE FROM thumbnails WHERE fullName = ?');
    const result = stmt.run(转换为相对磁盘根目录路径(fullName));
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
    if (!磁盘缩略图数据库) {
        console.log("未找到数据库实例")
        return
    }
    if (!磁盘缩略图数据库.readOnly) {
        await 磁盘缩略图数据库.lock()
        const hash = 计算哈希(stat)
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
        const mockStat = {
            ...stat,
            path: 转换为相对磁盘根目录路径(stat.path),
        }
        const result = await stmt.run(
            转换为相对磁盘根目录路径(fullName),
            type,
            hash,
            updateTimeValue,
            JSON.stringify(mockStat),
            mockStat.size !== undefined ? mockStat.size : -1,
            mockStat.ctime ? new Date(mockStat.ctime).getTime() : -1,
            mockStat.atime ? new Date(mockStat.atime).getTime() : -1,
            mockStat.mtime ? new Date(mockStat.mtime).getTime() : -1,
            转换为相对磁盘根目录路径(fullName),
            hash
        );
        await 磁盘缩略图数据库.unlock()
        return result
    } else {
        console.log("磁盘数据库似乎已锁定,尝试重载")

        磁盘缩略图数据库.reload()
    }
    return
}

function 构建子文件夹查询SQL(search, extensions) {
    let sql = `
        SELECT stat
        FROM thumbnails 
        WHERE fullName LIKE ? || '%' 
        AND fullName != ? 
    `;
    
    if (search) {
        sql += ` AND fullName LIKE '%' || ? || '%'`;
    }
    
    if (extensions && extensions.length > 0) {
        sql += ` AND (`;
        sql += extensions.map(() => `fullName LIKE '%' || ?`).join(' OR ');
        sql += `)`;
    }
    
    sql += ` LIMIT 100000`;
    return sql;
}

function 构建子文件夹查询参数(dirPath, search, extensions) {
    const params = [转换为相对磁盘根目录路径(dirPath) + "%", 转换为相对磁盘根目录路径(dirPath)];
    
    if (search) {
        params.push(search);
    }
    
    if (extensions && extensions.length > 0) {
        params.push(...extensions.map(ext => `.${ext}`));
    }
    
    return params;
}

function 处理子文件夹查询结果(results, 数据库根目录) {
    return results.map(item => {
        let json = JSON.parse(item.stat);
        return {
            ...json,
            path: 数据库根目录 + json.path
        };
    });
}

export async function 查找子文件夹(dirPath, search, extensions) {
    const start = Date.now();
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(dirPath);
    
    const sql = 构建子文件夹查询SQL(search, extensions);
    const params = 构建子文件夹查询参数(dirPath, search, extensions);
    
    const stmt = 磁盘缩略图数据库.prepare(sql);
    const countStmt = 磁盘缩略图数据库.prepare('SELECT MAX(rowid) as approximate_count FROM thumbnails');
    const approximateCount = countStmt.get().approximate_count;
    
    const results = stmt.all(...params);
    
    console.log("查询耗时", Date.now() - start, '结果数量', approximateCount);
    
    return {
        results: 处理子文件夹查询结果(results, 磁盘缩略图数据库.root),
        approximateCount: approximateCount
    };
}

export async function 查找文件hash(filePath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(filePath)
    const stmt = 磁盘缩略图数据库.prepare('SELECT fullName, statHash, updateTime FROM thumbnails WHERE fullName = ?');
    const result = stmt.get(转换为相对磁盘根目录路径(filePath));
    return result;
}
export async function 查找文件状态(filePath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(filePath)
    const stmt = 磁盘缩略图数据库.prepare(`SELECT * FROM thumbnails WHERE fullName = ? and type='file'`);
    const result = stmt.get(转换为相对磁盘根目录路径(filePath));
    return result;
}
export async function 查找文件夹状态(filePath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(filePath)
    const stmt = 磁盘缩略图数据库.prepare(`SELECT * FROM thumbnails WHERE fullName = ? and type='dir'`);
    const result = stmt.get(转换为相对磁盘根目录路径(filePath));
    return result;
}

export async function 查找并解析文件状态(filePath) {
    const result = await 查找文件状态(filePath)
    if (result) {
        let json = JSON.parse(result.stat)
        json.hash = result.statHash
        json.path = filePath
        return json
    } else {
        return undefined
    }
}
export async function 提取所有子目录文件扩展名(dirPath) {
    let 磁盘缩略图数据库 = await 根据路径查找并加载主数据库(dirPath)
    const sql = `
        SELECT fullName
        FROM thumbnails
        WHERE fullName LIKE ? || '%'
        AND type = 'file'
    `;
    const stmt = 磁盘缩略图数据库.prepare(sql);
    const results = stmt.all(转换为相对磁盘根目录路径(dirPath) + "%");

    // 使用JavaScript处理扩展名
    const extensions = new Set();
    for (let i = 0; i < results.length; i++) {
        const fileName = results[i].fullName.split('/').pop(); // 获取文件名
        const match = fileName.match(/\.([^.]+)$/);
        if (match) {
            extensions.add(match[1].toLowerCase());
        }
    }
    return Array.from(extensions);
}