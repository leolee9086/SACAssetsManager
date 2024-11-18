const fs = require('fs').promises;
const os = require('os');
const crypto = require('crypto');
const path = require('path')
const 活跃锁 = new Set();
const 锁超时时间 = 5 * 60 * 1000; // 5分钟超时

// 获取本地计算机的指纹
function 获取计算机指纹() {
    const networkInterfaces = os.networkInterfaces();
    const macAddresses = Object.values(networkInterfaces)
        .flat()
        .filter(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
        .map(iface => iface.mac)
        .join(',');
    return crypto.createHash('md5').update(macAddresses).digest('hex');
}

const 计算机指纹 = 获取计算机指纹();

// 创建锁内容
function 创建锁内容(mode = 'read') {
    return JSON.stringify({
        workspace: siyuanConfig.system.workspaceDir,
        fingerprint: 计算机指纹,
        timestamp: Date.now(),
        mode
    });
}

// 检查锁是否过期
function 检查锁超时(lockInfo) {
    return Date.now() - lockInfo.timestamp > 锁超时时间;
}

// 创建读取锁
export async function 创建读取锁(dbPath) {
    const lockPath = `${dbPath}.read.lock`;
    const writeLockPath = `${dbPath}.write.lock`;

    try {
        // 检查写锁
        try {
            const writeLockContent = await fs.readFile(writeLockPath, 'utf-8');
            const writeLockInfo = JSON.parse(writeLockContent);
            
            if (writeLockInfo.fingerprint !== 计算机指纹) {
                if (检查锁超时(writeLockInfo)) {
                    await fs.unlink(writeLockPath);
                } else {
                    return false;
                }
            }
        } catch (error) {
            // 写锁不存在或已被清理，继续处理
        }

        // 创建读锁
        await fs.writeFile(lockPath, 创建锁内容('read'), { flag: 'wx' });
        活跃锁.add(lockPath);
        return true;
    } catch (error) {
        if (error.code === 'EEXIST') {
            try {
                const existingContent = await fs.readFile(lockPath, 'utf-8');
                const lockInfo = JSON.parse(existingContent);
                
                if (检查锁超时(lockInfo)) {
                    await fs.unlink(lockPath);
                    return await 创建读取锁(dbPath);
                }
                
                return lockInfo.fingerprint === 计算机指纹;
            } catch (e) {
                return false;
            }
        }
        console.error('创建读取锁失败:', error);
        return false;
    }
}

// 创建写入锁
export async function 创建写入锁(dbPath) {
    const writeLockPath = `${dbPath}.write.lock`;
    const readLockPattern = `${dbPath}.read.*.lock`;

    try {
        // 检查并清理过期的读锁
        const readLocks = await fs.readdir(path.dirname(dbPath));
        const expiredReadLocks = await Promise.all(
            readLocks
                .filter(file => file.match(readLockPattern))
                .map(async file => {
                    const lockPath = path.join(path.dirname(dbPath), file);
                    try {
                        const content = await fs.readFile(lockPath, 'utf-8');
                        const lockInfo = JSON.parse(content);
                        return { path: lockPath, info: lockInfo };
                    } catch {
                        return null;
                    }
                })
        );

        // 清理过期读锁
        await Promise.all(
            expiredReadLocks
                .filter(lock => lock && 检查锁超时(lock.info))
                .map(lock => fs.unlink(lock.path))
        );

        // 创建写锁
        await fs.writeFile(writeLockPath, 创建锁内容('write'), { flag: 'wx' });
        活跃锁.add(writeLockPath);
        return true;
    } catch (error) {
        if (error.code === 'EEXIST') {
            try {
                const existingContent = await fs.readFile(writeLockPath, 'utf-8');
                const lockInfo = JSON.parse(existingContent);
                
                if (检查锁超时(lockInfo)) {
                    await fs.unlink(writeLockPath);
                    return await 创建写入锁(dbPath);
                }
                
                return lockInfo.fingerprint === 计算机指纹;
            } catch (e) {
                return false;
            }
        }
        console.error('创建写入锁失败:', error);
        return false;
    }
}

// 安全的数据库操作包装器
export async function 安全读取数据库(dbPath, 操作函数) {
    if (await 创建读取锁(dbPath)) {
        try {
            return await 操作函数();
        } finally {
            await 释放文件锁(dbPath);
        }
    }
    throw new Error('无法获取读取锁');
}

export async function 安全写入数据库(dbPath, 操作函数) {
    if (await 创建写入锁(dbPath)) {
        try {
            return await 操作函数();
        } finally {
            await 释放文件锁(dbPath);
        }
    }
    throw new Error('无法获取写入锁');
}

// 修改原有的释放锁函数
export async function 释放文件锁(dbPath) {
    const readLockPath = `${dbPath}.read.lock`;
    const writeLockPath = `${dbPath}.write.lock`;
    
    for (const lockPath of [readLockPath, writeLockPath]) {
        try {
            const existingContent = await fs.readFile(lockPath, 'utf-8');
            const lockInfo = JSON.parse(existingContent);
            
            if (lockInfo.fingerprint === 计算机指纹) {
                await fs.unlink(lockPath);
                活跃锁.delete(lockPath);
                console.log(`成功释放锁: ${lockPath}`);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`释放锁失败: ${lockPath}`, error);
            }
        }
    }
}

// 在进程退出时清理锁
process.on('exit', () => {
    自动释放所有文件锁();
});

// 在窗口关闭时清理锁
const remote = require('@electron/remote');
const currentWindow = remote.getCurrentWindow();
currentWindow.on('close', () => {
    自动释放所有文件锁();
});

