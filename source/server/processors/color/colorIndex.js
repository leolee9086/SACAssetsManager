import { diffColor } from "../../../utils/color/Kmeans.js";
import { getCachePath } from '../fs/cached/fs.js';
import { 修正路径分隔符号为正斜杠 } from "../../../utils/fs/fixPath.js";
const path=require('path')
const fs = require('fs').promises
const { open } =  window.require('lmdb');
import {安全写入数据库,安全读取数据库} from './LMDBlock.js'
// 替换原有的db创建代码
const dbInstances = new Map();
console.log(111)
// 获取或创建数据库实例
async function getDb(diskPath) {
    const sacPath = path.join(diskPath, '.sac');
    const dbPath = path.join(sacPath, 'colorindex.db');
    
    if (dbInstances.has(dbPath)) {
        return dbInstances.get(dbPath);
    }

    // 确保.sac目录存在
    await fs.mkdir(sacPath, { recursive: true });
    
    const rootDb = open({
        path: 修正路径分隔符号为正斜杠(dbPath),
        compression: true
    });

    const db = {
        colorIndex: rootDb.openDB('colorIndex'),
        fileIndex: rootDb.openDB('fileIndex'),
        metadata: rootDb.openDB('metadata'),
        exactColorIndex: rootDb.openDB('exactColorIndex'),
        root: rootDb
    };

    dbInstances.set(dbPath, db);
    return db;
}


// 获取所有颜色
export async function 获取索引中所有颜色(diskPath) {
    const colorSet = new Set();
    
    for (const db of dbInstances.values()) {
        for await (const { value } of db.colorIndex.getRange()) {
            colorSet.add(value.color.join(','));
        }
    }
    
    return Array.from(colorSet).map(colorStr => 
        colorStr.split(',').map(Number)
    );
}

// 加载索引
export async function 根据路径查找并加载颜色索引(path) {
    const { cachePath, root } = await getCachePath(path, 'colorIndex');
    console.error(cachePath, root);
    await 从路径加载颜色索引(cachePath, root);
}

export async function 从路径加载颜色索引(cachePath, root) {
    return await 安全写入数据库(cachePath, async () => {
        const db = await getDb(root);
        await 清理颜色索引(db, root);
        return db;
    });
}


async function 创建备份文件(filePath, data) {
    const today = new Date().toISOString().split('T')[0];
    const backupPath = filePath.replace('.json', `-${today}.json`);
    await fs.writeFile(backupPath, JSON.stringify(data));

    const dirPath = path.dirname(filePath);
    const files = await fs.readdir(dirPath);
    const backupFiles = files.filter(file => 
        file.startsWith(path.basename(filePath, '.json')) && 
        file.endsWith('.json') && 
        !file.endsWith('chunk.json')
    );

    // 按日期排序并保留最近三个备份
    backupFiles.sort((a, b) => {
        const dateRegex = /-(\d{4}-\d{2}-\d{2})\.json$/;
        const matchA = a.match(dateRegex);
        const matchB = b.match(dateRegex);
        if (matchA && matchB) {
            return new Date(matchB[1]) - new Date(matchA[1]);
        }
        return 0;
    });

    for (let i = 3; i < backupFiles.length; i++) {
        await fs.unlink(path.join(dirPath, backupFiles[i]));
    }
}

async function 更新颜色索引(data, root) {
    await db.transaction(async () => {
        for (const item of data) {
            if (!item.assets) continue;

            // 处理资源路径
            const processedAssets = await Promise.all(item.assets.map(async asset => ({
                ...asset,
                path: asset.path.startsWith(root) 
                    ? asset.path 
                    : 修正路径分隔符号为正斜杠(path.join(root, asset.path))
            })));
            item.assets = processedAssets;

            const colorValue = item.color.join(',');
            
            // 更新常规颜色索引
            let existing = await db.colorIndex.get(colorValue) || { 
                color: item.color, 
                assets: [] 
            };
            existing.assets = existing.assets.concat(item.assets);
            await db.colorIndex.put(colorValue, existing);

            // 更新精确颜色索引
            let exactFiles = await db.exactColorIndex.get(colorValue) || [];
            const newFiles = item.assets.map(asset => asset.path);
            exactFiles = Array.from(new Set([...exactFiles, ...newFiles]));
            await db.exactColorIndex.put(colorValue, exactFiles);

            // 更新文件索引
            for (const asset of item.assets) {
                let fileColors = await db.fileIndex.get(asset.path) || [];
                fileColors.push({
                    color: item.color,
                    percent: asset.percent,
                    count: asset.count
                });
                await db.fileIndex.put(asset.path, fileColors);
            }
        }
    });
}

// 添加颜色索引
export async function 添加到颜色索引(colorItem, absolutePath) {
    // 获取磁盘根目录和相对路径
    const { diskRoot, relativePath } = 获取磁盘根目录和相对路径(absolutePath);
    const db = await getDb(diskRoot);
    
    const colorFormated = colorItem.color.map(num => Math.floor(num));
    const colorValue = colorFormated.join(',');
    
    const colorData = await db.colorIndex.get(colorValue) || { 
        color: colorFormated, 
        assets: [] 
    };
    
    const assetItem = {
        count: colorItem.count,
        percent: Number(colorItem.percent).toFixed(2),
        path: relativePath
    };
    
    if (!colorData.assets.find(item => item.path === relativePath)) {
        colorData.assets.push(assetItem);
        await db.colorIndex.put(colorValue, colorData);
    }

    const fileColors = await db.fileIndex.get(relativePath) || [];
    const existingColorIndex = fileColors.findIndex(item => 
        item.color.join(',') === colorItem.color.join(',')
    );
    
    if (existingColorIndex === -1) {
        fileColors.push({
            color: colorItem.color,
            percent: colorItem.percent,
            count: colorItem.count
        });
    } else {
        fileColors[existingColorIndex] = {
            color: colorItem.color,
            percent: colorItem.percent,
            count: colorItem.count
        };
    }
    await db.fileIndex.put(relativePath, fileColors);

    const exactFiles = await db.exactColorIndex.get(colorValue) || [];
    if (!exactFiles.includes(relativePath)) {
        exactFiles.push(relativePath);
        await db.exactColorIndex.put(colorValue, exactFiles);
    }
}

// 查询函数
export async function 根据颜色查找内容(color, cutout = 0.6) {
    const results = new Set();
    
    for (const [dbPath, db] of dbInstances) {
        const diskRoot = path.parse(dbPath).root;
        
        await 安全读取数据库(dbPath, async () => {
            for await (const { value } of db.colorIndex.getRange()) {
                if (diffColor(value.color, color, cutout)) {
                    for (const asset of value.assets) {
                        const absolutePath = path.isAbsolute(asset.path) 
                            ? asset.path 
                            : path.join(diskRoot, asset.path);
                        results.add(修正路径分隔符号为正斜杠(absolutePath));
                    }
                }
            }
        });
    }
    
    return Array.from(results);
}

// 计算匹配总数
async function 计算颜色匹配总数(color, cutout, dbInstances) {
    let totalItems = 0;
    
    for (const [_, db] of dbInstances) {
        for await (const { value } of db.colorIndex.getRange()) {
            if (diffColor(value.color, color, cutout)) {
                totalItems += value.assets.length;
            }
        }
    }
    
    return totalItems;
}

// 处理单个资源路径
function 处理资源路径(data, diskRoot) {
    const absolutePath = path.isAbsolute(data.path) 
        ? data.path 
        : path.join(diskRoot, data.path);
    return 修正路径分隔符号为正斜杠(absolutePath);
}

// 处理匹配项
async function 处理颜色匹配项(db, diskRoot, color, cutout, callback, count, totalItems) {
    for await (const { value } of db.colorIndex.getRange()) {
        if (diffColor(value.color, color, cutout)) {
            for (const data of value.assets) {
                count++;
                const processedPath = 处理资源路径(data, diskRoot);
                await callback(processedPath, count, totalItems);
            }
        }
    }
    return count;
}

// 主函数
export async function 流式根据颜色查找内容(color, cutout = 0.6, callback) {
    let count = 0;
    
    // 计算总数
    const totalItems = await 计算颜色匹配总数(color, cutout, dbInstances);
    console.log(`找到总计 ${totalItems} 个匹配项`);
    
    // 处理匹配项
    for (const [dbPath, db] of dbInstances) {
        const diskRoot = path.parse(dbPath).root;
        count = await 处理颜色匹配项(
            db, 
            diskRoot, 
            color, 
            cutout, 
            callback, 
            count, 
            totalItems
        );
    }
    
    console.log(`处理完成，共处理 ${count}/${totalItems} 个结果`);
}

// 查找文件颜色
export async function 找到文件颜色(absolutePath) {
    const { diskRoot, relativePath } = 获取磁盘根目录和相对路径(absolutePath);
    const db = await getDb(diskRoot);
    
    return await db.fileIndex.get(relativePath) || null;
}

// 删除记录
export async function 删除文件颜色记录(absolutePath) {
    const { diskRoot, relativePath } = 获取磁盘根目录和相对路径(absolutePath);
    const db = await getDb(diskRoot);
    
    // 从文件索引中删除
    await db.fileIndex.remove(relativePath);
    
    // 从颜色索引中删除
    for await (const { key, value } of db.colorIndex.getRange()) {
        value.assets = value.assets.filter(asset => asset.path !== relativePath);
        if (value.assets.length > 0) {
            await db.colorIndex.put(key, value);
        } else {
            await db.colorIndex.remove(key);
        }
    }
    
    // 从精确索引中删除
    for await (const { key, value } of db.exactColorIndex.getRange()) {
        const newFiles = value.filter(path => path !== relativePath);
        if (newFiles.length > 0) {
            await db.exactColorIndex.put(key, newFiles);
        } else {
            await db.exactColorIndex.remove(key);
        }
    }
}



// 清理索引
async function 清理颜色索引(db, root) {
    if (!db || !db.colorIndex) {
        console.error('数据库实例未正确初始化');
        return;
    }

    console.log('开始清理颜色索引');
    const start = performance.now();
    
    const 清理后索引 = new Map();
    
    try {
        // 在根数据库上使用事务
        await db.root.transaction(async () => {
            for await (const { value } of db.colorIndex.getRange()) {
                const 颜色值 = value.color.join(',');
                const 已存在索引 = 清理后索引.get(颜色值);
                
                if (!已存在索引) {
                    清理后索引.set(颜色值, value);
                    await db.colorIndex.put(颜色值, value);
                    // 更新精确索引
                    const exactFiles = value.assets.map(asset => asset.path);
                    await db.exactColorIndex.put(颜色值, exactFiles);
                } else {
                    已存在索引.assets = 已存在索引.assets.concat(value.assets);
                    await db.colorIndex.put(颜色值, 已存在索引);
                    // 更新精确索引
                    const exactFiles = Array.from(new Set(
                        已存在索引.assets.map(asset => asset.path)
                    ));
                    await db.exactColorIndex.put(颜色值, exactFiles);
                }
            }
        });
    } catch (e) {
        console.error('清理颜色索引时出错:', e);
    }
    const end = performance.now();
    console.log('索引清理耗时', end - start);
}

// 验证索引
export async function 根据颜色查找并校验颜色索引文件条目(颜色) {
    const 颜色值 = 颜色.join(',');
    const 颜色索引条目 = await db.colorIndex.get(颜色值);
     
    if (!颜色索引条目) return null;
    
    return await 校验颜色索引文件条目(颜色索引条目);
}

export async function 校验颜色索引文件条目(颜色索引条目) {
    const 路径存在结果 = await Promise.all(
        颜色索引条目.assets.map(async (asset) => {
            try {
                await fs.access(asset.path);
                return true;
            } catch {
                颜色索引条目.assets = 颜色索引条目.assets.filter(a => a.path !== asset.path);
                await db.colorIndex.put(颜色索引条目.color.join(','), 颜色索引条目);
                return false;
            }
        })
    );
    
    return 路径存在结果.every(Boolean);
}

// 数据库备份
async function 创建数据库备份(db, diskRoot) {
    const backupDir = path.join(diskRoot, '.sac', 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    // 使用ISO格式日期
    const today = new Date().toISOString().split('T')[0];
    const backupPath = path.join(backupDir, `colorindex-${today}.backup`);
    
    // 创建备份
    await db.backup(backupPath);
    
    // 获取并排序备份文件
    const files = await fs.readdir(backupDir);
    const backupFiles = files
        .filter(f => f.startsWith('colorindex-') && f.endsWith('.backup'))
        .sort((a, b) => {
            const dateRegex = /-(\d{4}-\d{2}-\d{2})\.backup$/;
            const matchA = a.match(dateRegex);
            const matchB = b.match(dateRegex);
            if (matchA && matchB) {
                return new Date(matchB[1]) - new Date(matchA[1]);
            }
            return 0;
        });
    
    // 保留最近三个备份
    for (let i = 3; i < backupFiles.length; i++) {
        const oldBackupPath = path.join(backupDir, backupFiles[i]);
        await fs.unlink(oldBackupPath);
    }

    // 记录备份信息
    await db.metadata.put('lastBackup', {
        date: today,
        path: backupPath,
        timestamp: Date.now()
    });
}

// 添加备份恢复功能
async function 恢复数据库备份(db, diskRoot, date) {
    const backupDir = path.join(diskRoot, '.sac', 'backups');
    const backupPath = path.join(backupDir, `colorindex-${date}.backup`);
    
    try {
        await fs.access(backupPath);
        await db.close(); // 关闭当前数据库连接
        await db.restore(backupPath); // 恢复备份
        return true;
    } catch (e) {
        console.error('恢复备份失败:', e);
        return false;
    }
}

// 添加精确颜色查询功能
export async function 精确查找颜色文件(color) {
    const colorKey = color.map(num => Math.floor(num)).join(',');
    const results = new Set();
    
    for (const [dbPath, db] of dbInstances) {
        // 获取磁盘根目录
        const diskRoot = path.parse(dbPath).root;
        
        const files = await db.exactColorIndex.get(colorKey);
        if (files) {
            for (const file of files) {
                // 转换为绝对路径
                const absolutePath = path.isAbsolute(file) 
                    ? file 
                    : path.join(diskRoot, file);
                // 确保使用正斜杠
                results.add(修正路径分隔符号为正斜杠(absolutePath));
            }
        }
    }
    
    return Array.from(results);
}

// 添加路径处理工具函数
function 获取磁盘根目录和相对路径(absolutePath) {
    // 确保使用正斜杠
    absolutePath = 修正路径分隔符号为正斜杠(absolutePath);
    const diskRoot = path.parse(absolutePath).root;
    const relativePath = path.relative(diskRoot, absolutePath);
    return { diskRoot, relativePath };
}

// 获取绝对路径
function 获取绝对路径(relativePath, diskRoot) {
    // 确保使用正斜杠
    const absolutePath = path.join(diskRoot, relativePath);
    return 修正路径分隔符号为正斜杠(absolutePath);
}

// 添加关闭数据库的方法
export async function closeDb(diskPath) {
    const sacPath = path.join(diskPath, '.sac');
    const dbPath = path.join(sacPath, 'colorindex.db');
    
    if (dbInstances.has(dbPath)) {
        const db = dbInstances.get(dbPath);
        await db.root.close();
        dbInstances.delete(dbPath);
    }
}

