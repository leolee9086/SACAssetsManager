export const defaultExcludePatterns = [
    `**/node_modules/**`,
    `**/.git/**`,
    `**/.svn/**`,
]
export function getGlobPatternsIncludingParent(topLevelFolders, parentDir) {
    // 构建用于遍历的pattern
    const pattern = `${parentDir}**`;
    // 构建排除模式列表
    const ignorePatterns = topLevelFolders
        .filter(folder => !folder.show) // 选择show为false的项
        .map(folder => `${parentDir}${folder.name}/**`);
    // 创建glob对象
    const globObject = {
        pattern: pattern,
        options: {
            // 排除show为false的文件夹
            ignore: ignorePatterns,
            // 其他glob选项...
            nodir: true, // 排除目录，只匹配文件
            dot: false, // 包括以点(.)开头的文件和目录
            // ... 其他选项
        }
    };
    return globObject;
}
// 构建排除文件夹的正则表达式,需要考虑parentDir是磁盘根目录的情况
function buildRegex(parentDir, folder) {
    // 将folder中的路径分隔符替换为正则表达式中的路径分隔符
    // 需要考虑folder中的特殊字符,例如空格,括号,星号,点号等
    //修正分割符
    let escapedFolder = folder.replace(/\\/g, '\\\\')
    //修正分割符
    .replace(/\//g, '\\/')
    //修正括号
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    //修正星号
    .replace(/\*/g, '\\*')
    //修正问号
    .replace(/\?/g, '\\?')
    //修正感叹号
    .replace(/\!/g, '\\!')
    //修正点号
    .replace(/\./g, '\\.')
    // 构建正则表达式的基础部分
    let regex = `^${parentDir}(\\/)?${escapedFolder}`;
  
    // 如果folder以"/"结尾，表示它是一个目录，我们需要添加一个可选的"/"和一个".*"来匹配任何子路径
    if (folder.endsWith('/')) {
      regex += '(?:\\/.*)?';
    }
  
    // 返回新的正则表达式对象
    return regex
  }
  
  
export function 构建搜索模式(topLevelFolders, parentDir, includeExtensions = [], excludeExtensions = []) {
   // 构建用于排除文件夹的匹配函数,使用mingo查询语法
   const excludePatterns = topLevelFolders
        .filter(folder => !folder.show) // 选择show为false的项
        .map(folder => {
            return {
                // 排除文件夹,也就是去掉路径开头为folder.name的项目
                path: { $not: { $regex: buildRegex(parentDir, folder.name) } }
            }
        });
    // 构建用于包含文件的sql查询语法
    const includePatterns = includeExtensions
        .map(ext => {
            return {
                // 包含文件,也就是路径中以ext结尾的项目
                path: { $regex: `.${ext}$` }
            }
        });
    // 构建用于排除文件的sql查询语法
    const extensions = excludeExtensions
        .map(ext => {
            return {
                // 排除文件,也就是路径中不以ext结尾的项目
                path: { $not: { $regex: `.${ext}$` } }
            }
        });
    // 返回构建的搜索模式
    const query = {
        $and: [
            ...excludePatterns,
            ...includePatterns,
            ...extensions
        ]
    }
    return {
        cwd: parentDir,
        query: query
    }
}