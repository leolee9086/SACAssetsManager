export const defaultExcludePatterns =[
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
export function getFilePatternsWithExtensions(topLevelFolders, parentDir, includeExtensions = [], excludeExtensions = []) {
    // 构建用于遍历的pattern
    const pattern = `${parentDir}**`;
    const ignorePatterns = topLevelFolders
        .filter(folder => !folder.show) // 选择show为false的项
        .map(folder => `${parentDir}${folder.name}/**`);

    // 构建包含模式列表
    let includePatterns = [];
    if (includeExtensions.length > 0) {
        includePatterns = includeExtensions.map(ext => {
            return `${parentDir}**/*.${ext}`;
        });
    }

    // 构建排除模式列表
    let excludePatterns = [];
    if (excludeExtensions.length > 0) {
        excludePatterns = excludeExtensions.map(ext => {
            return `${parentDir}**/*.${ext}`;
        });
    }

    // 创建glob对象
    const globObject = {
        pattern: pattern,
        options: {
            // 应用排除模式
            ignore: excludePatterns.concat(ignorePatterns),
            // 应用包含模式，如果存在
            ...(includePatterns.length > 0 && { include: includePatterns }),
            // 其他glob选项...
            nodir: true, // 排除目录，只匹配文件
            dot: false, // 包括以点(.)开头的文件和目录
            // ... 其他选项
        }
    };

    return globObject;
}