/**
 * 拼接路径,需要保证拼接的路径是正确的
 * @param {string} dir
 * @param {object} entries
 * @returns
 */
export function 拼接文件名(dir, name) {
    const result = dir.replace(/\\/g, '/') + '/' + name;
    return result.replace(/\/\//g, '/');
}
