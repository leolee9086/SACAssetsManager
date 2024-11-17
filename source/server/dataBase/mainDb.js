const { open } =  window.require('lmdb');
const path =  require('path');
import { getCachePath } from '../processors/fs/cached/fs.js';
import { 修正路径分隔符号为正斜杠, 修正路径分隔符号为反斜杠 } from "../../utils/fs/fixPath.js";
const { createHash } = require('crypto');

// 数据库实例缓存
const dbInstances = new Map();

// 添加到文件顶部
const LMDB_CONFIG = {
    cacheSize: 100 * 1024 * 1024, // 100MB cache
    maxDbs: 1,
    compression: true,
    // 清理配置
    cleanupInterval: 15 * 60 * 1000, // 15分钟
    maxIdleTime: 30 * 60 * 1000     // 30分钟
};

// 添加数据库锁定机制
const dbLocks = new Map();

/**
 * @typedef {Object} FileEntry
 * @property {string} fullName - 相对路径
 * @property {string} type - 条目类型 ('file'|'dir')
 * @property {string} statHash - 状态哈希
 * @property {number} updateTime - 更新时间戳
 * @property {Object} stat - 文件状态
 * @property {number} size - 文件大小
 * @property {number} ctime - 创建时间戳
 * @property {number} atime - 访问时间戳
 * @property {number} mtime - 修改时间戳
 */

/**
 * 获取数据库实例
 * @param {string} filePath 文件路径
 * @returns {Promise<LMDB.Database>}
 */
async function 获取数据库实例(filePath) {
    const { cachePath } = await getCachePath(filePath, 'mainDb');
    
    if (dbInstances.has(cachePath)) {
        const db = dbInstances.get(cachePath);
        db.lastAccess = Date.now(); // 更新访问时间
        return db;
    }

    const db = open({
        path: cachePath,
        keyEncoding: 'string',
        valueEncoding: 'json',
        ...LMDB_CONFIG
    });

    db.lastAccess = Date.now();
    dbInstances.set(cachePath, db);
    return db;
}

/**
 * 转换为相对磁盘根目录路径
 * @param {string} fullPath 完整路径
 * @returns {string} 相对路径
 */
function 转换为相对磁盘根目录路径(fullPath) {
    const root = path.parse(fullPath).root;
    return fullPath.slice(root.length);
}

/**
 * 计算状态哈希
 * @param {Object} stat 文件状态对象
 * @returns {string} 哈希值
 */
export function 计算哈希(stat) {
    const hash = createHash('md5');
    hash.update(转换为相对磁盘根目录路径(stat.path));
    hash.update(stat.size.toString());
    hash.update(stat.mtime.getTime().toString());
    return hash.digest('hex').substring(0, 8);
}

/**
 * 安全的数据库操作包装
 * @template T
 * @param {function(): Promise<T>} operation 数据库操作
 * @param {string} errorMessage 错误信息
 * @returns {Promise<T>} 操作结果
 */
async function 安全数据库操作(operation, errorMessage) {
    try {
        return await operation();
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        throw new Error(`${errorMessage}: ${error.message}`);
    }
}

/**
 * 写入缩略图缓存
 * @param {string} fullName 完整文件名
 * @param {Date|number} updateTime 更新时间
 * @param {Object} stat 文件状态
 * @param {string} [entryType] 条目类型
 */
export async function 写入缩略图缓存行(fullName, updateTime, stat, entryType) {
    return 安全数据库操作(async () => {
        if (!stat) throw new Error('尝试写入缓存记录时未提供stat');
        if (fullName.indexOf('\\') > -1) throw new Error('尝试写入缓存时路径未转换');
        if (!stat.type && !entryType) throw new Error('尝试写入缓存时未提供条目类型');

        const db = await 获取数据库实例(fullName);
        await 锁定数据库(db);
        
        try {
            const relativePath = 转换为相对磁盘根目录路径(fullName);
            const hash = 计算哈希(stat);

            const existing = await db.get(relativePath);
            if (existing?.statHash === hash) {
                return; // 如果hash相同，跳过写入
            }

            const entry = {
                fullName: relativePath,
                type: entryType || stat.type,
                statHash: hash,
                updateTime: updateTime instanceof Date ? updateTime.getTime() : updateTime,
                stat: {
                    ...stat,
                    path: 转换为相对磁盘根目录路径(stat.path)
                },
                size: stat.size ?? -1,
                ctime: stat.ctime ? new Date(stat.ctime).getTime() : -1,
                atime: stat.atime ? new Date(stat.atime).getTime() : -1,
                mtime: stat.mtime ? new Date(stat.mtime).getTime() : -1
            };

            await db.put(relativePath, entry);
        } finally {
            await 解锁数据库(db);
        }
    }, '写入缓存失败');
}

/**
 * 删除缩略图缓存
 * @param {string} fullName 完整文件名
 */
export async function 删除缩略图缓存行(fullName) {
    const db = await 获取数据库实例(fullName);
    const relativePath = 转换为相对磁盘根目录路径(fullName);
    await db.remove(relativePath);
}

/**
 * 查找文件状态
 * @param {string} filePath 文件路径
 * @returns {Promise<Object|null>} 文件状态
 */
export async function 查找文件状态(filePath) {
    const db = await 获取数据库实例(filePath);
    const relativePath = 转换为相对磁盘根目录路径(filePath);
    const entry = await db.get(relativePath);
    return entry?.type === 'file' ? entry : null;
}

/**
 * 获取数据库中的记录数量
 * @param {LMDB.Database} db 数据库实例
 * @param {string} prefix 前缀路径
 * @returns {Promise<number>} 记录数量
 */
async function 获取记录数量(db, prefix) {
    let count = 0;
    for await (const _ of db.getRange({
        start: prefix,
        end: prefix + '\uffff'
    })) {
        count++;
    }
    return count;
}

/**
 * 查找子文件夹内容
 * @param {string} dirPath 目录路径
 * @param {string} [search] 搜索关键词
 * @param {string[]} [extensions] 扩展名过滤
 * @returns {Promise<{results: Array, approximateCount: number}>}
 */
export async function 查找子文件夹(dirPath, search, extensions) {
    return 安全数据库操作(async () => {
        const start = Date.now();
        const db = await 获取数据库实例(dirPath);
        const relativeDirPath = 转换为相对磁盘根目录路径(dirPath);
        const results = [];
        
        // 使用与SQLite版本相同的限制
        const range = {
            start: relativeDirPath,
            end: relativeDirPath + '\uffff',
            limit: 100000 // 与SQLite版本保持一致
        };

        const searchLower = search?.toLowerCase();
        
        for await (const { key, value } of db.getRange(range)) {
            if (key === relativeDirPath) continue;
            
            // 匹配搜索条件
            if (search && !key.toLowerCase().includes(searchLower)) continue;
            
            // 匹配扩展名
            if (extensions?.length > 0) {
                const hasMatchingExt = extensions.some(ext => 
                    key.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
                );
                if (!hasMatchingExt) continue;
            }

            results.push({
                ...value.stat,
                path: path.join(path.parse(dirPath).root, value.stat.path)
            });
        }

        console.log(Date.now() - start); // 保持性能日志

        // 获取近似记录数
        const approximateCount = await 获取记录数量(db, relativeDirPath);

        return {
            results,
            approximateCount
        };
    }, '查找子文件夹失败');
}

/**
 * 清理数据库实例缓存
 * @param {string} [dbPath] 特定数据库路径
 */
export async function 清理数据库实例(dbPath) {
    if (dbPath) {
        const db = dbInstances.get(dbPath);
        if (db) {
            await db.close();
            dbInstances.delete(dbPath);
        }
    } else {
        for (const [path, db] of dbInstances) {
            await db.close();
        }
        dbInstances.clear();
    }
}

// 定期清理未使用的数据库实例
setInterval(() => {
    const now = Date.now();
    for (const [path, db] of dbInstances) {
        if (now - db.lastAccess > 30 * 60 * 1000) { // 30分钟未使用
            清理数据库实例(path);
        }
    }
}, 15 * 60 * 1000); // 每15分钟检查一次

/**
 * 查找文件夹状态
 * @param {string} filePath 文件路径
 * @returns {Promise<Object|null>} 文件夹状态
 */
export async function 查找文件夹状态(filePath) {
    const db = await 获取数据库实例(filePath);
    const relativePath = 转换为相对磁盘根目录路径(filePath);
    const entry = await db.get(relativePath);
    return entry?.type === 'dir' ? entry : null;
}

/**
 * 查找文件hash
 * @param {string} filePath 文件路径
 * @returns {Promise<Object|null>} 文件hash信息
 */
export async function 查找文件hash(filePath) {
    const db = await 获取数据库实例(filePath);
    const relativePath = 转换为相对磁盘根目录路径(filePath);
    const entry = await db.get(relativePath);
    return entry ? {
        fullName: entry.fullName,
        statHash: entry.statHash,
        updateTime: entry.updateTime
    } : null;
}

/**
 * 查找并解析文件状态
 * @param {string} filePath 文件路径
 * @returns {Promise<Object|undefined>} 解析后的文件状态
 */
export async function 查找并解析文件状态(filePath) {
    const result = await 查找文件状态(filePath);
    if (result) {
        return {
            ...result.stat,
            hash: result.statHash,
            path: filePath
        };
    }
    return undefined;
}

/**
 * 提取所有子目录文件扩展名
 * @param {string} dirPath 目录路径
 * @returns {Promise<string[]>} 扩展名列表
 */
export async function 提取所有子目录文件扩展名(dirPath) {
    const db = await 获取数据库实例(dirPath);
    const relativeDirPath = 转换为相对磁盘根目录路径(dirPath);
    const extensions = new Set();
    
    for await (const { key, value } of db.getRange({
        start: relativeDirPath,
        end: relativeDirPath + '\uffff'
    })) {
        if (value.type === 'file') {
            const match = key.match(/\.([^.]+)$/);
            if (match) {
                extensions.add(match[1].toLowerCase());
            }
        }
    }
    
    return Array.from(extensions);
}

/**
 * 数据库实例管理器
 */
class DatabaseManager {
    constructor() {
        this.instances = new Map();
        this.startCleanupTimer();
    }

    startCleanupTimer() {
        setInterval(() => this.cleanup(), LMDB_CONFIG.cleanupInterval);
    }

    async cleanup() {
        const now = Date.now();
        for (const [path, db] of this.instances) {
            if (now - db.lastAccess > LMDB_CONFIG.maxIdleTime) {
                await this.closeDatabase(path);
            }
        }
    }

    async closeDatabase(dbPath) {
        const db = this.instances.get(dbPath);
        if (db) {
            await db.close();
            this.instances.delete(dbPath);
        }
    }
}

const dbManager = new DatabaseManager();

function 规范化路径(filePath) {
    return 修正路径分隔符号为正斜杠(path.normalize(filePath));
}

async function 锁定数据库(db) {
    if (!dbLocks.has(db.path)) {
        dbLocks.set(db.path, new Promise(resolve => resolve()));
    }
    const currentLock = dbLocks.get(db.path);
    const newLock = new Promise(async (resolve) => {
        await currentLock;
        resolve();
    });
    dbLocks.set(db.path, newLock);
    await currentLock;
}

async function 解锁数据库(db) {
    const lock = dbLocks.get(db.path);
    if (lock) {
        await lock;
        dbLocks.delete(db.path);
    }
}
