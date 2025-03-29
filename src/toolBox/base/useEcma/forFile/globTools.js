/**
 * glob模式匹配工具
 * 提供文件路径匹配功能，支持构建复杂的搜索模式
 */

/**
 * 默认排除的文件夹模式
 */
export const 默认排除模式 = [
  `**/node_modules/**`,
  `**/.git/**`,
  `**/.svn/**`,
];

/**
 * 构建包含父目录的Glob模式
 * @param {Array<Object>} 顶级文件夹 - 文件夹列表，每项包含name和show属性
 * @param {string} 父目录 - 父目录路径
 * @returns {Object} glob配置对象
 */
export function 构建包含父目录的Glob模式(顶级文件夹, 父目录) {
  // 构建用于遍历的pattern
  const 模式 = `${父目录}**`;
  
  // 构建排除模式列表
  const 忽略模式 = 顶级文件夹
    .filter(文件夹 => !文件夹.show) // 选择show为false的项
    .map(文件夹 => `${父目录}${文件夹.name}/**`);
  
  // 创建glob配置对象
  return {
    pattern: 模式,
    options: {
      // 排除show为false的文件夹
      ignore: 忽略模式,
      // 其他glob选项
      nodir: true, // 排除目录，只匹配文件
      dot: false   // 包括以点(.)开头的文件和目录
    }
  };
}

/**
 * 构建正则表达式，用于匹配文件路径
 * @param {string} 父目录 - 父目录路径
 * @param {string} 文件夹 - 文件夹名称
 * @returns {string} 正则表达式字符串
 * @private
 */
function 构建正则表达式(父目录, 文件夹) {
  // 转义特殊字符
  let 转义后文件夹 = 文件夹.replace(/\\/g, '\\\\')
    .replace(/\//g, '\\/')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\*/g, '\\*')
    .replace(/\?/g, '\\?')
    .replace(/\!/g, '\\!')
    .replace(/\./g, '\\.');
  
  // 构建正则表达式基础部分
  let 正则 = `^${父目录}(\\/)?${转义后文件夹}`;
  
  // 如果文件夹以"/"结尾，添加匹配任何子路径的模式
  if (文件夹.endsWith('/')) {
    正则 += '(?:\\/.*)?';
  }
  
  return 正则;
}

/**
 * 构建搜索模式
 * @param {Array<Object>} 顶级文件夹 - 文件夹列表，每项包含name和show属性
 * @param {string} 父目录 - 父目录路径
 * @param {Array<string>} 包含扩展名 - 要包含的文件扩展名列表
 * @param {Array<string>} 排除扩展名 - 要排除的文件扩展名列表
 * @returns {Object} 搜索模式配置
 */
export function 构建搜索模式(顶级文件夹, 父目录, 包含扩展名 = [], 排除扩展名 = []) {
  // El
  // 构建用于排除文件夹的匹配条件
  const 排除模式 = 顶级文件夹
    .filter(文件夹 => !文件夹.show) // 选择show为false的项
    .map(文件夹 => ({
      // 排除文件夹,也就是去掉路径开头为folder.name的项目
      path: { $not: { $regex: 构建正则表达式(父目录, 文件夹.name) } }
    }));
  
  // 构建用于包含文件的查询条件
  const 包含模式 = 包含扩展名
    .map(扩展名 => ({
      // 包含文件,也就是路径中以ext结尾的项目
      path: { $regex: `.${扩展名}$` }
    }));
  
  // 构建用于排除文件的查询条件
  const 扩展名排除 = 排除扩展名
    .map(扩展名 => ({
      // 排除文件,也就是路径中不以ext结尾的项目
      path: { $not: { $regex: `.${扩展名}$` } }
    }));
  
  // 返回完整的搜索查询
  return {
    cwd: 父目录,
    query: {
      $and: [
        ...排除模式,
        ...包含模式,
        ...扩展名排除
      ]
    }
  };
}

// 为了兼容性，保留原始函数名的导出
export const defaultExcludePatterns = 默认排除模式;
export const getGlobPatternsIncludingParent = 构建包含父目录的Glob模式; 