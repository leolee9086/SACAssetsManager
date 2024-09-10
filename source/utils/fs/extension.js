export function getFileExtension(imagePath) {
    // 获取文件名（去除路径）
    const fileName = imagePath.split('/').pop().split('\\').pop();
    // 查找最后一个点号的位置
    const lastDotIndex = fileName.lastIndexOf('.');
    // 如果存在点号且不在开头，返回小写的扩展名，否则返回空字符串
    return (lastDotIndex > 0) ? fileName.slice(lastDotIndex + 1).toLowerCase() : '';
}