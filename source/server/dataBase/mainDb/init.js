import { 创建文件锁, 释放文件锁 } from "./sqlLock.js"
const Database = require('better-sqlite3')
let dbs = {}
let locks = {}

globalThis.thumbnailPathDBs = globalThis.thumbnailPathDBs || dbs
/**
 * 为了保证属性扩展的灵活性,所以这里仅仅创建单个数据表
 * 需要一个这样的函数是因为每个磁盘都需要一个索引数据库
 * @param {*} dbPath 
 * @param {*} root 
 * @returns 
 */
async function 初始化数据库(dbPath, root) {
    console.log('[初始化数据库] 开始初始化:', { dbPath, root });
    if (dbs[root]) {
        console.log('[初始化数据库] 数据库已存在,直接返回');
        return dbs[root]
    }
    const lockDb = async () => {
        try {
            locks[root] = await 创建文件锁(dbPath);
            console.log('[初始化数据库] 成功创建文件锁');
        } catch (error) {
            console.error('[初始化数据库] 创建文件锁失败:', error);
            throw new Error(`无法创建文件锁: ${dbPath}`);
        }
    }
    if (!locks[root]) {
        await lockDb()
    }

    const readOnly = !locks[root]
    console.log('[初始化数据库] 创建数据库实例:', { readOnly });
    dbs[root] = new Database(dbPath, { readonly: readOnly });
    dbs[root].pragma('journal_mode = WAL');
    dbs[root].pragma('synchronous = NORMAL');
    dbs[root].pragma('cache_size = 1000');
    dbs[root].pragma('temp_store = MEMORY');
    if (!readOnly) {
        console.log('[初始化数据库] 创建数据表');
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
    } else {
        console.warn('[初始化数据库] 数据库锁定中,以只读方式启动:', dbPath)
    }
    dbs.readOnly = readOnly
    // 添加关闭数据库的方法，同时释放文件锁
    dbs[root].lock = async () => {
        if (!readOnly) {
            await lockDb()
        }
    };
    let unlockTimeout;

    dbs[root].unlock = async () => {
        if (!readOnly) {
            // 清除之前的计时器
            if (unlockTimeout) {
                clearTimeout(unlockTimeout);
            }

            // 设置新的计时器，延迟10秒后执行解锁操作
            unlockTimeout = setTimeout(async () => {
                try {
                    await 释放文件锁(dbPath);
                    console.log('[初始化数据库] 成功释放文件锁');
                    locks[root] = false;
                } catch (error) {
                    console.error('[初始化数据库] 释放文件锁失败:', error);
                }
            }, 10000); // 10秒延迟
        } else {
            console.warn('[初始化数据库] 数据库以只读方式启动，无法释放文件锁:', dbPath);
        }
    };
    dbs[root].closeAndUnlock = async () => {
        dbs[root].close();
        if (!readOnly) {
            try {
                await 释放文件锁(dbPath);
                console.log('[初始化数据库] 成功释放文件锁');
                locks[root] = false;
            } catch (error) {
                console.error('[初始化数据库] 释放文件锁失败:', error);
            }
        }
        delete dbs[root];
    };
    // 添加 reloadDb 方法
    dbs[root].reload = async () => {
        console.log('[初始化数据库] 重新加载数据库:', dbPath);
        await dbs[root].closeAndUnlock(); // 关闭并解锁现有数据库
        return await 初始化数据库(dbPath, root); // 重新初始化数据库
    };
    dbs[root].root = root
    dbs[root].unlock()
    console.log('[初始化数据库] 数据库初始化完成');
    return dbs[root]
}

import { getCachePath } from "../../processors/fs/cached/fs.js";
const dbVersion = '08'
export async function 根据文件名获取主数据库地址(filePath) {
    console.log('[根据文件名获取主数据库地址] 开始获取:', filePath);
    const { cachePath, root } = await getCachePath(filePath, `thumbnailIndex.${dbVersion}.db`)
    console.log('[根据文件名获取主数据库地址] 获取结果:', { cachePath, root });
    return { cachePath, root }
}

export async function 根据路径查找并加载主数据库(filePath) {
    console.log('[根据路径查找并加载主数据库] 开始查找:', filePath);
    const { cachePath, root } = await 根据文件名获取主数据库地址(filePath)
    console.log('[根据路径查找并加载主数据库] 数据库地址:', { cachePath, root });
    /**
     * 这里应该已经创建好了文件夹,所以不许需要重复校验创建
     */
    const db = await 初始化数据库(cachePath, root);
    console.log('[根据路径查找并加载主数据库] 数据库加载完成');
    return db;
}


