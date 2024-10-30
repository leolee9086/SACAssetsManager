export const 打开文件夹 = (path) => {
    const { shell } = require('@electron/remote');
    shell.showItemInFolder(path);
}
export const 批量打开文件夹 = (pathArray) => {
    pathArray.forEach(element => {
        打开文件夹(element)
    });
}