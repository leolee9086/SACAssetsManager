const fs=require('fs').promises
const os = require('os')
const crypto = require('crypto')

const 活跃锁 = new Set()
// 生成解锁脚本的函数

// 获取本地计算机的指纹
function 获取计算机指纹() {
    const networkInterfaces = os.networkInterfaces()
    const macAddresses = Object.values(networkInterfaces)
        .flat()
        .filter(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
        .map(iface => iface.mac)
        .join(',')
    return crypto.createHash('md5').update(macAddresses).digest('hex')
}

const 计算机指纹 = 获取计算机指纹()
const lockContent = `${siyuanConfig.system.workspaceDir}|${计算机指纹}`

export async function 创建文件锁(dbPath) {
    const lockPath = `${dbPath}.lock`
    try {
        await fs.writeFile(lockPath, lockContent, { flag: 'wx' })
        活跃锁.add(lockPath)
        return true
    } catch (error) {
        if (error.code === 'EEXIST') {
            const _lockContent = await fs.readFile(lockPath, 'utf-8')
            return _lockContent === lockContent
        }
        throw error
    }
}

export async function 释放文件锁(dbPath) {
    const lockPath = `${dbPath}.lock`;
    try {
        // 检查锁文件是否存在
        await fs.access(lockPath);

        // 读取锁文件内容
        const existingLock = await fs.readFile(lockPath, 'utf-8');

        // 检查锁文件内容是否与当前实例匹配
        if (existingLock === lockContent) {
            // 尝试删除锁文件
            await fs.unlink(lockPath);
            活跃锁.delete(lockPath);
            console.log(`成功释放文件锁: ${lockPath}`);
        } else {
            console.warn(`锁文件内容不匹配，无法释放: ${lockPath}`);
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`锁文件不存在: ${lockPath}`);
        } else if (error.code === 'EACCES') {
            console.error(`没有权限释放文件锁: ${lockPath}`);
        } else {
            console.error('释放文件锁时出错:', error);
        }
    }
}
export async function 自动释放所有文件锁() {
    for (const lockPath of 活跃锁) {
        try {
            const existingLock = await fs.readFile(lockPath, 'utf-8')
            if (existingLock === lockContent) {
                await fs.unlink(lockPath)
                console.log(`自动释放文件锁: ${lockPath}`)
            } else {
                console.log(`跳过非本实例创建的锁: ${lockPath}`)
            }
        } catch (error) {
            console.error(`处理文件锁 ${lockPath} 时出错:`, error)
        }
    }
    活跃锁.clear()
}
window.强制释放所有文件锁= async function 强制释放所有文件锁() {
    for (const lockPath of 活跃锁) {
        try {
                await fs.unlink(lockPath)
                console.log(`强制释放所有锁: ${lockPath}`)
        } catch (error) {
            console.error(`处理文件锁 ${lockPath} 时出错:`, error)
        }
    }
    活跃锁.clear()
}


process.on('exit', () => {
    自动释放所有文件锁()
})
const remote = require('@electron/remote');

// 获取当前窗口
const currentWindow = remote.getCurrentWindow();

// 监听当前窗口的 'close' 事件
currentWindow.on('close', () => {
    自动释放所有文件锁();
});

// 监听当前 webContents 的 'destroyed' 事件
const currentWebContents = remote.getCurrentWebContents();
currentWebContents.on('destroyed', () => {
    自动释放所有文件锁();
});

