export async function tryBecomeMaster(masterFile, masterTimeout) {
    const fs = require('fs').promises;
    const lockFile = `${masterFile}.lock`;

    // 尝试获取锁文件的访问权限，如果不存在则创建
    try {
        await fs.access(lockFile, fs.constants.F_OK);
    } catch {
        await fs.writeFile(lockFile, '');
    }

    // 以读写模式打开锁文件
    const lockFd = await fs.open(lockFile, 'r+');

    try {
        // 尝试获取文件锁
        await lockFd.lock();
        let isMasterExpired = true;

        try {
            // 检查主文件是否存在以及是否过期
            const stats = await fs.stat(masterFile);
            isMasterExpired = Date.now() - stats.mtime.getTime() > masterTimeout;
        } catch {
            // 主文件不存在，视为过期
        }

        if (isMasterExpired) {
            // 更新锁文件内容为当前进程的PID
            await fs.writeFile(lockFile, process.pid.toString());
            return true; // 成功成为master
        }
    } catch (error) {
        console.error('无法获取锁或更新主文件:', error);
    } finally {
        // 确保锁被释放并关闭文件描述符
        await lockFd.unlock();
        await lockFd.close();
    }
    return false; // 未能成为master
}