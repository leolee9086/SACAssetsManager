const Database = require('better-sqlite3')
let dbs = {}
globalThis.thumbnailPathDBs = globalThis.thumbnailPathDBs || dbs
/**
 * 为了保证属性扩展的灵活性,所以这里仅仅创建单个数据表
 * 需要一个这样的函数是因为每个磁盘都需要一个索引数据库
 * @param {*} dbPath 
 * @param {*} root 
 * @returns 
 */
export function 初始化数据库(dbPath, root) {
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
    dbs[root].prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_name ON thumbnails(fullName)').run();
    dbs[root].prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_statHash ON thumbnails(statHash)').run();
    return dbs[root]
}

import { getCachePath } from "../../processors/fs/cached/fs.js";
const dbVersion = '07'
export async function 根据文件名获取主数据库地址(filePath) {
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`)
    return { cachePath, root }
}

export async function 根据路径查找并加载主数据库(filePath) {
    const { cachePath, root } = await 根据文件名获取主数据库地址(filePath)
    /**
     * 这里应该已经创建好了文件夹,所以不许需要重复校验创建
     */
    return 初始化数据库(cachePath, root);
}