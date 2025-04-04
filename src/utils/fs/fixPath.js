export function 修正路径分隔符号为反斜杠(path) {
    // 使用正则表达式替换所有正斜杠为反斜杠
    return path.replace(/\//g, '\\');
}
export function 修正路径分隔符号为正斜杠(path) {
    // 使用正则表达式替换所有反斜杠为正斜杠
    return path.replace(/\\/g, '/');
}