const url = require('url');

export const getType = (uri) => {
    if (uri.startsWith('file://')) {
        return 'file';
    } else if (uri.startsWith('siyuan://')) {
        return 'note';
    } else {
        return 'remote';
    }
}
export const fileURLToPath = (url) => {
    // 使用 url 模块解析 URL
    const parsedUrl = url.parse(url);
    // 检查协议是否为 'file:'
    if (parsedUrl.protocol !== 'file:') {
        throw new Error('The URL must be a file URL.');
    }
    // 将解析后的路径部分转换为本地路径
    // 这里使用 'win32' 作为格式化参数，以适配Windows系统
    // 如果你总是在Unix-like系统上运行，可以使用 'posix' 作为参数
    return url.fileURLToPath(parsedUrl);
}
export const isSubDir = (parent, dir) => {
    // 规范化路径以避免路径分隔符的差异
    const parentPath = path.resolve(parent);
    const dirPath = path.resolve(dir);

    // 检查 dirPath 是否以 parentPath 开头
    // 使用 path.posix 来确保路径分隔符为 '/'
    return path.posix.relative(parentPath, dirPath).startsWith('.');
};


/**
 * 返回确切的文件夹创建时间和更新时间
 * @param {string} dir - 文件夹的路径
 * @returns {Promise<{birthtime: Date, ctime: Date}>} - 包含创建时间和更新时间的对象
 */
export const statDir = async (dir) => {
    try {
        const stats = await fs.stat(dir);
        // 在某些系统上，birthtime 是文件的创建时间，但在其他系统上可能不可用
        // ctime 是文件状态改变的时间，通常接近于更新时间
        return {
            birthtime: stats.birthtime,
            ctime: stats.ctime
        };
    } catch (error) {
        console.error('Error accessing the directory:', error);
        throw error; // 根据需要处理错误，这里只是简单地抛出错误
    }
};
