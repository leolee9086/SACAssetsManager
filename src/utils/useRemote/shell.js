if (!window.require) {
    throw new Error('这个模块依赖node环境,不能在前端调用')
}
const shell = window.require('@electron/remote').shell;
//这里顺序不是很重要所以使用forEach
export const 在资源管理器打开本地文件夹数组 = async (文件夹数组) => {
    if (文件夹数组.length > 0) {
        Array.from(new Set(文件夹数组)).forEach(folderPath => {
            if (folderPath !== '/') {
                shell.openPath(folderPath);
            }
        });
    } else {
        console.log('没有可打开的文件夹');
    }
}

