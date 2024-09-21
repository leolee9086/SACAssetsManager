/**
 * 将Windows路径转换为相对于磁盘根目录的相对路径
 * @param {string} dirPath - 要转换的Windows路径
 * @return {string} 相对于磁盘根目录的路径
 */
export function 转换为相对磁盘根目录路径(dirPath) {
    // 使用正则表达式匹配驱动器字母
    const match = dirPath.match(/^([A-Za-z]:)(.*)$/);
    if (match) {
      // 如果匹配成功,返回去掉驱动器字母的路径
      return match[2].replace(/\\/g, '/');
    }
    // 如果没有匹配到驱动器字母,返回原路径(已将反斜杠替换为正斜杠)
    return dirPath.replace(/\\/g, '/');
  }