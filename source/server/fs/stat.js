export const statWithCatch = async (path) => {
    try {
        const stat = await fs.promises.stat(path);
        return {
            ...stat,
            type: stat.isDirectory() ? 'dir' : 'file'
        };
    } catch (error) {
        // 如果是目录不存在的错误，返回一个特殊的目录状态
        if (error.code === 'ENOENT') {
            return {
                type: 'dir',
                size: 0,
                birthtime: new Date(),
                mtime: new Date(),
                ctime: new Date(),
                atime: new Date()
            };
        }
        return null;
    }
} 